"""API Discovery Registry - Crawler adapters for discovered APIs."""
import asyncio
import json
import re
from datetime import datetime, timezone, timedelta
from typing import Any, Optional
from urllib.parse import urljoin, urlparse

import aiohttp
import httpx
from loguru import logger

from app.config import settings
from app.crawlers import SourceAdapter
from app.schemas import APISourceSchema, APISourceCreate
from app.database import AsyncSessionLocal
from app.models import APISource, APISourceHealthLog


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class APIRegistryAdapter(SourceAdapter):
    """Adapter that syncs API metadata from public-apis repository."""

    def __init__(self, session=None):
        super().__init__("PublicAPIs Registry", "https://github.com/public-apis/public-apis", session)
        self.repo_url = "https://raw.githubusercontent.com/public-apis/public-apis/master/README.md"

    def record_type(self) -> str:
        return "api_source"

    async def collect(self) -> list[dict]:
        """Fetch and parse API metadata from public-apis README."""
        records = []

        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30)) as session:
                async with session.get(self.repo_url) as resp:
                    if resp.status != 200:
                        logger.error(f"Failed to fetch public-apis README: {resp.status}")
                        return records
                    content = await resp.text()

            # Parse the markdown table format
            records = self._parse_public_apis_readme(content)
            logger.info(f"Parsed {len(records)} API sources from public-apis")

        except Exception as e:
            logger.error(f"Failed to collect from public-apis registry: {e}")

        return records

    def _parse_public_apis_readme(self, content: str) -> list[dict]:
        """Parse the public-apis README markdown for API tables."""
        records = []

        # Find all table sections (markdown tables)
        # Pattern: ### Category followed by table
        section_pattern = r"###\s+(\w+(?:\s+\w+)*)\n\| API \| Description \| Auth \| HTTPS \| CORS \|\n\|[-:|]+\n((?:\|.+\|\n)*)"

        for match in re.finditer(section_pattern, content):
            category = match.group(1).strip().lower().replace(" & ", "_").replace(" ", "_")
            table_content = match.group(2)

            # Parse each row
            for line in table_content.strip().split("\n"):
                if not line.startswith("|"):
                    continue
                parts = [p.strip() for p in line.split("|")[1:-1]]  # Skip first/last empty
                if len(parts) >= 4:
                    api_name = parts[0].strip()
                    description = parts[1].strip()
                    auth = parts[2].strip()
                    https = parts[3].strip() == "Yes"
                    cors = parts[4].strip() if len(parts) > 4 else "Unknown"

                    # Extract URL from markdown link [name](url)
                    url_match = re.search(r"\[([^\]]+)\]\(([^)]+)\)", api_name)
                    if url_match:
                        name = url_match.group(1)
                        doc_url = url_match.group(2)
                    else:
                        name = api_name
                        doc_url = ""

                    # Clean up auth type
                    auth_type = "none"
                    if auth and auth != "No":
                        if "OAuth" in auth:
                            auth_type = "OAuth"
                        elif "apiKey" in auth:
                            auth_type = "apiKey"
                        else:
                            auth_type = auth.lower()

                    # Determine subcategory and tags
                    subcategory, tags = self._categorize_api(category, description)

                    record = {
                        "name": name,
                        "category": category,
                        "subcategory": subcategory,
                        "description": description,
                        "documentation_url": doc_url,
                        "source_url": self._extract_base_url(doc_url),
                        "auth_type": auth_type,
                        "https_support": https,
                        "cors_support": cors,
                        "free_tier": auth_type == "none" or "free" in description.lower(),
                        "tags": tags,
                        "provenance": {"source": "public-apis", "original_category": category},
                        "integration_priority": self._calculate_priority(category, tags, auth_type),
                    }
                    records.append(record)

        return records

    def _extract_base_url(self, doc_url: str) -> str:
        """Extract base API URL from documentation URL."""
        try:
            parsed = urlparse(doc_url)
            return f"{parsed.scheme}://{parsed.netloc}"
        except:
            return ""

    def _categorize_api(self, category: str, description: str) -> tuple[str, list[str]]:
        """Map public-apis category to FrontierAtlas categories and tags."""
        desc_lower = description.lower()
        tags = []

        # FrontierAtlas-relevant categories
        if category == "machine_learning":
            if any(kw in desc_lower for kw in ["startup", "company", "business", "funding"]):
                return "ai_startups", ["ai", "startups", "companies"]
            elif any(kw in desc_lower for kw in ["paper", "research", "arxiv", "publication", "academic"]):
                return "research_papers", ["ai", "research", "papers"]
            elif any(kw in desc_lower for kw in ["github", "repository", "repo", "code", "model"]):
                return "github_repos", ["ai", "github", "models"]
            elif any(kw in desc_lower for kw in ["product", "tool", "directory", "marketplace", "service"]):
                return "ai_products", ["ai", "products", "tools"]
            elif any(kw in desc_lower for kw in ["news", "article", "blog", "trend"]):
                return "ai_news", ["ai", "news"]
            elif any(kw in desc_lower for kw in ["job", "career", "hiring", "recruit", "talent"]):
                return "ai_jobs", ["ai", "jobs"]
            else:
                return "ml_general", ["ai", "ml"]

        elif category == "news":
            return "news", ["news", "general"]
        elif category == "jobs":
            return "jobs", ["jobs", "careers"]
        elif category == "development":
            return "development", ["development", "apis"]
        elif category == "open_data":
            return "open_data", ["open_data"]
        elif category == "open_source_projects":
            return "github_repos", ["github", "open_source"]
        elif category == "business":
            return "business_intelligence", ["business", "companies"]
        elif category == "programming":
            return "development", ["programming"]

        return category, [category.replace("_", " ")]

    def _calculate_priority(self, category: str, tags: list[str], auth_type: str) -> int:
        """Calculate integration priority (higher = more important)."""
        priority = 0

        # Category priority
        category_priorities = {
            "machine_learning": 100,
            "news": 80,
            "jobs": 80,
            "development": 60,
            "open_source_projects": 60,
            "business": 50,
            "open_data": 40,
        }
        priority += category_priorities.get(category, 10)

        # Tag bonuses
        tag_bonuses = {
            "ai": 20,
            "startups": 15,
            "research": 15,
            "papers": 15,
            "github": 15,
            "products": 15,
            "tools": 10,
            "news": 15,
            "jobs": 15,
        }
        for tag in tags:
            priority += tag_bonuses.get(tag, 0)

        # Free tier bonus
        if auth_type == "none":
            priority += 10

        return priority


class APIHealthCheckAdapter(SourceAdapter):
    """Health check adapter for registered API sources."""

    def __init__(self, session=None):
        super().__init__("API Health Checker", "internal", session)

    def record_type(self) -> str:
        return "api_health"

    async def collect(self) -> list[dict]:
        """This adapter is used for health checking, not data collection."""
        return []

    async def check_source_health(self, api_source: APISource) -> dict:
        """Perform health check on an API source."""
        if not api_source.source_url:
            return {
                "success": False,
                "error_message": "No source URL configured",
                "status_code": 0,
            }

        start_time = datetime.now(timezone.utc)
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as session:
                async with session.get(api_source.source_url) as resp:
                    response_time = int((datetime.now(timezone.utc) - start_time).total_seconds() * 1000)
                    return {
                        "success": resp.status < 400,
                        "status_code": resp.status,
                        "response_time_ms": response_time,
                        "rate_limit_remaining": resp.headers.get("X-RateLimit-Remaining"),
                        "rate_limit_reset": resp.headers.get("X-RateLimit-Reset"),
                    }
        except asyncio.TimeoutError:
            return {
                "success": False,
                "error_message": "Timeout",
                "status_code": 408,
                "response_time_ms": 10000,
            }
        except Exception as e:
            return {
                "success": False,
                "error_message": str(e),
                "status_code": 0,
                "response_time_ms": int((datetime.now(timezone.utc) - start_time).total_seconds() * 1000),
            }


# Specialized adapters for high-priority APIs discovered from public-apis

class AIJobsAdapter(SourceAdapter):
    """AI Dev Jobs - AI/ML engineering job aggregator with REST, RSS, and MCP endpoints."""

    def __init__(self, session=None):
        super().__init__("AI Dev Jobs", "https://aidevboard.com", session)

    def record_type(self) -> str:
        return "job"

    async def collect(self) -> list[dict]:
        records = []
        try:
            # Try the OpenAPI spec first
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30)) as session:
                async with session.get("https://aidevboard.com/openapi.yaml") as resp:
                    if resp.status == 200:
                        # Parse OpenAPI to find job endpoints
                        # For now, try common endpoints
                        pass

                # Try REST endpoint
                async with session.get("https://aidevboard.com/api/jobs") as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        for job in data.get("jobs", []):
                            records.append({
                                "source_name": self.source_name,
                                "source_url": job.get("url", ""),
                                "company": job.get("company", ""),
                                "title": job.get("title", ""),
                                "job_url": job.get("url", ""),
                                "description": job.get("description", ""),
                                "location": job.get("location", ""),
                                "is_remote": job.get("remote", False),
                                "employment_type": job.get("type", ""),
                                "role_family": job.get("category", ""),
                                "published_date": job.get("posted_date"),
                                "raw_data": job,
                            })
        except Exception as e:
            logger.error(f"AI Dev Jobs collection failed: {e}")

        return records


class AIResearchPapersAdapter(SourceAdapter):
    """Aggregated research papers from multiple sources."""

    def __init__(self, session=None):
        super().__init__("AI Research Papers", "https://api.research-papers.ai", session)

    def record_type(self) -> str:
        return "paper"

    async def collect(self) -> list[dict]:
        # Placeholder for future integration with research paper APIs
        return []


class GitHubRepoSearchAdapter(SourceAdapter):
    """Search GitHub for AI-related repositories using GitHub API."""

    def __init__(self, session=None):
        super().__init__("GitHub Search", "https://api.github.com", session)

    def record_type(self) -> str:
        return "paper"  # We'll store GitHub repos alongside papers

    async def collect(self) -> list[dict]:
        records = []
        if not settings.github_token:
            logger.warning("GitHub token not configured, skipping GitHub search")
            return records

        queries = [
            "topic:machine-learning stars:>100",
            "topic:ai stars:>100",
            "topic:llm stars:>50",
            "topic:generative-ai stars:>50",
        ]

        headers = {"Authorization": f"token {settings.github_token}"}

        try:
            async with aiohttp.ClientSession(headers=headers, timeout=aiohttp.ClientTimeout(total=30)) as session:
                for query in queries:
                    url = f"https://api.github.com/search/repositories?q={query}&sort=stars&order=desc&per_page=50"
                    async with session.get(url) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            for repo in data.get("items", []):
                                if repo.get("stargazers_count", 0) < 10:
                                    continue
                                records.append({
                                    "source_name": self.source_name,
                                    "source_url": repo["html_url"],
                                    "title": repo["name"],
                                    "authors": [repo["owner"]["login"]],
                                    "abstract": repo.get("description", ""),
                                    "paper_url": repo["html_url"],
                                    "github_url": repo["html_url"],
                                    "github_stars": repo["stargazers_count"],
                                    "github_repo_owner": repo["owner"]["login"],
                                    "github_repo_name": repo["name"],
                                    "published_date": repo["created_at"],
                                    "raw_data": repo,
                                })
                        elif resp.status == 403:
                            logger.warning("GitHub API rate limited")
                            break
                        await asyncio.sleep(1)  # Rate limiting
        except Exception as e:
            logger.error(f"GitHub search failed: {e}")

        return records


# Registry of API source adapters
API_SOURCE_ADAPTERS = {
    "public_apis_registry": APIRegistryAdapter(),
    "ai_dev_jobs": AIJobsAdapter(),
    "ai_research_papers": AIResearchPapersAdapter(),
    "github_search": GitHubRepoSearchAdapter(),
    "health_checker": APIHealthCheckAdapter(),
}


async def sync_api_registry() -> dict:
    """Sync API metadata from public-apis repository to database."""
    adapter = APIRegistryAdapter()
    records = await adapter.collect()

    stats = {"created": 0, "updated": 0, "errors": 0}

    async with AsyncSessionLocal() as session:
        for record in records:
            try:
                # Check if exists
                from sqlalchemy import select
                result = await session.execute(
                    select(APISource).where(APISource.name == record["name"])
                )
                existing = result.scalar_one_or_none()

                if existing:
                    # Update
                    for key, value in record.items():
                        if key != "name" and hasattr(existing, key):
                            setattr(existing, key, value)
                    existing.last_checked_at = utcnow()
                    stats["updated"] += 1
                else:
                    # Create
                    new_source = APISource(**record)
                    new_source.last_checked_at = utcnow()
                    session.add(new_source)
                    stats["created"] += 1

            except Exception as e:
                logger.error(f"Error syncing API source {record.get('name')}: {e}")
                stats["errors"] += 1

        await session.commit()

    return stats


async def check_all_api_health() -> dict:
    """Run health checks on all enabled API sources."""
    from sqlalchemy import select

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(APISource).where(APISource.enabled == True, APISource.status == "ACTIVE")
        )
        sources = result.scalars().all()

    checker = APIHealthCheckAdapter()
    stats = {"checked": 0, "healthy": 0, "degraded": 0, "unhealthy": 0, "errors": 0}

    for source in sources:
        try:
            health = await checker.check_source_health(source)
            stats["checked"] += 1

            # Log health check
            log_entry = APISourceHealthLog(
                api_source_id=source.id,
                status_code=health.get("status_code"),
                response_time_ms=health.get("response_time_ms"),
                success=health.get("success", False),
                error_message=health.get("error_message"),
                rate_limit_remaining=health.get("rate_limit_remaining"),
                rate_limit_reset=health.get("rate_limit_reset"),
            )

            async with AsyncSessionLocal() as session:
                session.add(log_entry)

                # Update source health
                if health.get("success"):
                    source.last_successful_call = utcnow()
                    source.consecutive_failures = 0
                    source.health_status = "HEALTHY"
                    stats["healthy"] += 1
                else:
                    source.consecutive_failures += 1
                    if source.consecutive_failures >= 3:
                        source.health_status = "UNHEALTHY"
                        stats["unhealthy"] += 1
                    else:
                        source.health_status = "DEGRADED"
                        stats["degraded"] += 1

                await session.commit()

        except Exception as e:
            logger.error(f"Health check failed for {source.name}: {e}")
            stats["errors"] += 1

    return stats