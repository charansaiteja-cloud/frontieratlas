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

    async def check_source_health(self, api_source: any) -> dict:
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


# GitHub search adapter
class GitHubRepoSearchAdapter(SourceAdapter):
    """Search GitHub for AI-related repositories using GitHub API."""

    def __init__(self, session=None):
        super().__init__("GitHub Search", "https://api.github.com", session)

    def record_type(self) -> str:
        return "paper"  # We'll store GitHub repos alongside papers

    async def collect(self) -> list[dict]:
        records = []

        queries = {
            "startup": [
                'topic:"startup" stars:>10',
                'topic:ai stars:>10',
                'topic:machine-learning stars:>10',
                'topic:artificial-intelligence stars:>10',
                'topic:saas stars:>10',
                'topic:mobile app stars:>10',
            ],
            "product": [
                'topic:product stars:>10',
                'topic:saas stars:>10',
                'topic:tool stars:>10',
                'topic:application stars:>10',
                'topic:web app stars:>10',
                'topic:mobile app stars:>10',
            ],
        }

        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30)) as session:
                for record_type, query_list in queries.items():
                    for query in query_list:
                        url = f"https://api.github.com/search/repositories?q={query}&sort=stars&order=desc&per_page=30"
                        attempt = 0
                        while attempt < 3:
                            attempt += 1
                            async with session.get(url) as resp:
                                if resp.status == 200:
                                    data = await resp.json()
                                    for repo in data.get("items", []):
                                        # Skip repos without descriptions - they can't be valid startups/products
                                        if not repo.get("description"):
                                            continue
                                        if repo.get("stargazers_count", 0) < 5:
                                            continue
                                        if record_type == "startup":
                                            record = {
                                                "source_name": self.source_name,
                                                "source_url": repo["html_url"],
                                                "entity_name": repo["name"],
                                                "abstract": repo.get("description", ""),
                                                "paper_url": repo["html_url"],
                                                "github_url": repo["html_url"],
                                                "github_stars": repo["stargazers_count"],
                                                "github_repo_owner": repo["owner"]["login"],
                                                "github_repo_name": repo["name"],
                                                "published_date": repo["created_at"],
                                                "raw_data": repo,
                                                "record_type": record_type,
                                            }
                                        else:  # product
                                            record = {
                                                "source_name": self.source_name,
                                                "source_url": repo["html_url"],
                                                "product_name": repo["name"],
                                                "abstract": repo.get("description", ""),
                                                "product_url": repo["html_url"],
                                                "github_url": repo["html_url"],
                                                "github_stars": repo["stargazers_count"],
                                                "github_repo_owner": repo["owner"]["login"],
                                                "github_repo_name": repo["name"],
                                                "published_date": repo["created_at"],
                                                "raw_data": repo,
                                                "record_type": record_type,
                                            }
                                        records.append(record)
                                    # Success - break retry loop
                                    break
                                elif resp.status == 403:
                                    logger.warning("GitHub API rate limited, backing off...")
                                    await asyncio.sleep(60 * attempt)  # Exponential backoff: 60s, 120s, 180s
                                    continue
                                else:
                                    logger.warning(f"GitHub API returned status {resp.status}")
                                    break
                        await asyncio.sleep(2)  # Rate limiting between queries
        except Exception as e:
            logger.error(f"GitHub search failed: {e}")

        return records


# Product Hunt adapter
class ProductHuntAdapter(SourceAdapter):
    """Product Hunt website scraper for commercial products."""
    def __init__(self, session=None):
        super().__init__("ProductHunt", "https://www.producthunt.com", session)

    def record_type(self) -> str:
        return "product"

    async def collect(self) -> list[dict]:
        records = []
        async with self._get_session() as session:
            for page in range(1, 5):  # 4 pages
                url = f"https://www.producthunt.com/posts?page={page}"
                try:
                    async with session.get(url) as resp:
                        html = await resp.text()
                except Exception:
                    break
                if not html or len(html) < 1000:
                    break
                # Product Hunt product cards parsing
                import re
                # Find product entries from the HTML
                entries = re.findall(
                    r'<div class="Post__StyledPost[^"]*".*?<h3[^>]*>(.*?)</h3>.*?<a[^>]*href="([^"]*)"[^>]*>(.*?)</a>',
                    html, re.DOTALL
                )
                for entry in entries[:8]:  # Limit per page
                    name = re.sub(r'<[^>]+>', '', entry[0]).strip() if entry[0] else None
                    product_url = entry[1] if len(entry) > 1 else None
                    # Extract tagline/description
                    tagline_match = re.search(r'<div class="Tagline[^"]*">(.*?)</div>', html)
                    description = re.sub(r'<[^>]+>', '', tagline_match.group(1)).strip() if tagline_match else None

                    records.append({
                        "product_name": name or f"Product Hunt Entry {page}",
                        "product_url": product_url,
                        "description": description,
                        "startup_name": None,
                        "pricing_model": "UNKNOWN",
                        "source_name": self.source_name,
                        "source_url": url,
                        "record_type": "product",
                    })
                await asyncio.sleep(3)  # Rate limiting - longer delays for web scraping
        return records

    def _get_session(self):
        import aiohttp
        timeout = aiohttp.ClientTimeout(total=settings.request_timeout)
        return aiohttp.ClientSession(timeout=timeout)


# Registry of API source adapters
API_SOURCE_ADAPTERS = {
    "public_apis_registry": APIRegistryAdapter(),
    "ai_dev_jobs": None,  # Placeholder - AIJobsAdapter removed for circular import
    "ai_research_papers": None,  # Placeholder - AIResearchPapersAdapter removed
    "github_search": GitHubRepoSearchAdapter(),
    "health_checker": APIHealthCheckAdapter(),
    "producthunt": ProductHuntAdapter(),
}

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

# GitHub Organization Repos Adapter
class GitHubOrgReposAdapter(SourceAdapter):
    """Fetch repositories from GitHub organizations - startups and products."""

    def __init__(self, session=None):
        super().__init__("GitHub Orgs", "https://github.com/orgs", session)

    def record_type(self) -> str:
        return "paper"  # We'll store repos alongside papers

    async def collect(self) -> list[dict]:
        records = []
        # List of well-known tech organizations that often have interesting repos
        organizations = [
            "ai", "machine-learning", "data-science", "startup", "sas",
            "productivity", "developer-tools", "open-source", "github"
        ]

        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30)) as session:
            for org in organizations:
                try:
                    # Fetch organization repositories page
                    url = f"https://github.com/orgs/{org}?repositories"
                    async with session.get(url) as resp:
                        if resp.status != 200:
                            continue
                        html = await resp.text()

                    # Parse repository names from the page
                    import re
                    repo_names = re.findall(r'<h3 class="f3 color-fg-normal mr-2"><a[^>]*href="/([^"]+)"', html)
                    repo_descriptions = re.findall(r'<p class="col-9 color-fg-muted my-1 pr-3")[^>]*>(.*?)</p>', html)

                    for i, repo_name in enumerate(repo_names[:10]):  # Limit per org
                        description = repo_descriptions[i] if i < len(repo_descriptions) else None
                        if not description:
                            description = f"Organization: {org}"

                        record = {
                            "source_name": self.source_name,
                            "source_url": f"https://github.com/{org}/{repo_name}",
                            "entity_name": repo_name if self.record_type() == "startup" else None,
                            "product_name": repo_name if self.record_type() == "product" else None,
                            "abstract": description,
                            "paper_url": f"https://github.com/{org}/{repo_name}",
                            "github_url": f"https://github.com/{org}/{repo_name}",
                            "github_stars": 0,  # Can't easily get star count without additional API calls
                            "github_repo_owner": org,
                            "github_repo_name": repo_name,
                            "published_date": None,
                            "raw_data": {"organization": org, "repo_name": repo_name},
                            "record_type": "startup" if self.record_type() == "startup" else "product",
                        }
                        records.append(record)
                except Exception as e:
                    logger.warning(f"Failed to fetch org {org}: {e}")
                    continue
                await asyncio.sleep(2)
        return records

    def _get_session(self):
        import aiohttp
        timeout = aiohttp.ClientTimeout(total=settings.request_timeout)
        return aiohttp.ClientSession(timeout=timeout)


# Add producthunt to API_SOURCE_ADAPTERS if not already present
if "producthunt" not in API_SOURCE_ADAPTERS:
    API_SOURCE_ADAPTERS["producthunt"] = ProductHuntAdapter()

# Add github_org to API_SOURCE_ADAPTERS
if "github_org" not in API_SOURCE_ADAPTERS:
    from app.crawlers.api_sources import GitHubOrgReposAdapter
    API_SOURCE_ADAPTERS["github_org"] = GitHubOrgReposAdapter()

# Update STARTUP_ADAPTERS_GITHUB and PRODUCT_ADAPTERS_GITHUB to include org adapter
_github_org_startup = GitHubOrgReposAdapter()
_github_org_startup.record_type = lambda: "startup"
_github_org_product = GitHubOrgReposAdapter()
_github_org_product.record_type = lambda: "product"
STARTUP_ADAPTERS_GITHUB_ORG = [_github_org_startup]
PRODUCT_ADAPTERS_GITHUB_ORG = [_github_org_product]
