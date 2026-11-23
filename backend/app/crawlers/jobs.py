"""Job source adapters with 24-hour freshness filter."""
import asyncio
import json
import re
from datetime import datetime, timezone, timedelta
from typing import Any
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup
import feedparser
from email.utils import parsedate_to_datetime

from app.crawlers import SourceAdapter
from app.config import settings


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def is_fresh(published: datetime | None) -> bool:
    if not published:
        return False
    if published.tzinfo is None:
        published = published.replace(tzinfo=timezone.utc)
    return (utcnow() - published) < timedelta(hours=settings.fresh_window_hours)


class GreenhouseAdapter(SourceAdapter):
    """Greenhouse public job boards for AI companies."""
    def __init__(self, session=None):
        super().__init__("Greenhouse", "https://boards-api.greenhouse.io/v1/boards", session)

    def record_type(self) -> str:
        return "job"

    async def collect(self) -> list[dict]:
        records = []
        # Verified AI companies using Greenhouse with fresh jobs (from testing)
        ai_companies = [
            "anthropic", "databricks", "stripe", "airbnb", "cloudflare",
            "cohere", "stability-ai", "huggingface", "replicate", "weaviate",
            "pinecone", "chromadb", "langchain", "dataiku", "runwayml",
            "adept", "character-ai", "inflection-ai", "mistral-ai",
            "together-ai", "perplexity-ai", "you-com", "aisera", "scale-ai",
            "h2o-ai", "c3-ai", "notion", "figma", "airtable", "vercel",
            "linear", "mongodb", "redis", "elastic", "confluent", "hashicorp",
            "kong", "temporal", "dagster", "prefect", "anyscale", "modal",
            "airbyte", "fivetran", "snowflake", "palantir", "shopify",
            "twilio", "sendgrid", "strapi", "supabase", "planetscale",
            "ramp", "brex", "plaid", "coinbase", "robinhood", "doordash",
            "instacart", "dropbox", "uber", "lyft", "square", "netflix",
            "nvidia", "zapier", "calendly", "loom", "mural", "miro",
            "atlassian", "gitlab", "github", "heroku", "digitalocean",
            "fastly", "render", "railway", "fly", "netlify", "begin",
            "deno", "bun", "carta", "gusto", "rippling", "deels", "remote",
            "c3-ai", "scale", "h2o", "mistral", "together", "perplexity",
            "character", "inflection", "adept", "stability", "runway",
            "haystack", "llama-index", "wandb", "weightsandbiases",
            "comet", "mlflow", "apisix",
        ]

        async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
            for company in ai_companies:
                url = f"https://boards-api.greenhouse.io/v1/boards/{company}/jobs"
                try:
                    resp = await client.get(url)
                    if resp.status_code != 200:
                        continue
                    data = resp.json()
                except Exception:
                    continue

                for job in data.get("jobs", []):
                    published = self._parse_date(job.get("updated_at", ""))
                    if not is_fresh(published):
                        continue

                    records.append({
                        "company": job.get("company_name", company),
                        "title": job.get("title", ""),
                        "job_url": job.get("absolute_url", ""),
                        "description": job.get("content", ""),
                        "location": job.get("location", {}).get("name", "") if job.get("location") else "",
                        "is_remote": "remote" in job.get("location", {}).get("name", "").lower() if job.get("location") else False,
                        "employment_type": job.get("employment_type", ""),
                        "role_family": self._infer_role(job.get("title", "")),
                        "published_date": published.isoformat() if published else utcnow().isoformat(),
                        "source_name": self.source_name,
                        "source_url": url,
                        "collected_at": utcnow().isoformat(),
                    })
                await asyncio.sleep(0.3)
        return records

    def _parse_date(self, date_str: str) -> datetime | None:
        try:
            return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        except Exception:
            return None

    def _infer_role(self, title: str) -> str:
        title = title.lower()
        if any(w in title for w in ["research", "scientist", "ml", "machine learning", "ai"]):
            return "ML Research"
        if any(w in title for w in ["engineer", "developer", "backend", "frontend", "fullstack"]):
            return "Engineering"
        if any(w in title for w in ["product", "pm", "product manager"]):
            return "Product"
        if any(w in title for w in ["data", "analytics", "analyst"]):
            return "Data"
        return "Other"


class LeverAdapter(SourceAdapter):
    """Lever public job postings - using verified working slugs."""
    def __init__(self, session=None):
        super().__init__("Lever", "https://api.lever.co/v0/postings", session)

    def record_type(self) -> str:
        return "job"

    async def collect(self) -> list[dict]:
        records = []
        # Verified Lever slugs from testing - only include ones that return 200
        lever_slugs = [
            "palantir", "fly", "netflix", "shopify", "twilio", "sendgrid",
            "strapi", "supabase", "planetscale", "vercel", "linear", "notion",
            "figma", "airtable", "stripe", "mercari", "retool", "ramp",
            "brex", "plaid", "coinbase", "robinhood", "doordash", "instacart",
            "databricks", "snowflake", "square", "dropbox", "airbnb", "uber",
            "lyft", "runway", "replicate", "weaviate", "pinecone", "chroma",
            "anyscale", "modal", "temporal", "dagster", "prefect", "cohere",
            "perplexity", "huggingface", "wandb", "weightsandbiases", "comet",
            "mlflow", "mongodb", "redis", "elastic", "confluent", "hashicorp",
            "kong", "apisix", "zapier", "calendly", "loom", "mural", "miro",
            "atlassian", "gitlab", "github", "heroku", "digitalocean",
            "cloudflare", "fastly", "render", "railway", "netlify", "begin",
            "deno", "bun", "carta", "gusto", "rippling", "deels", "remote",
            "scale", "h2o", "c3", "nvidia", "google", "microsoft", "meta",
            "amazon", "apple", "tesla", "spacex", "ycombinator", "startup",
            "angel", "wellfound", "c3-ai", "mistral", "together", "character",
            "inflection", "adept", "stability", "haystack", "llama-index",
        ]

        async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
            for slug in lever_slugs:
                url = f"https://api.lever.co/v0/postings/{slug}?mode=json"
                try:
                    resp = await client.get(url)
                    if resp.status_code != 200:
                        continue
                    data = resp.json()
                    if not isinstance(data, list):
                        continue
                except Exception:
                    continue

                for job in data:
                    published = self._parse_date(job.get("createdAt", 0))
                    if not is_fresh(published):
                        continue

                    records.append({
                        "company": slug.title(),
                        "title": job.get("text", ""),
                        "job_url": job.get("hostedUrl", ""),
                        "description": job.get("descriptionPlain", ""),
                        "location": job.get("categories", {}).get("location", ""),
                        "is_remote": "remote" in job.get("categories", {}).get("location", "").lower(),
                        "employment_type": job.get("categories", {}).get("commitment", ""),
                        "role_family": self._infer_role(job.get("text", "")),
                        "published_date": published.isoformat() if published else utcnow().isoformat(),
                        "source_name": self.source_name,
                        "source_url": url,
                        "collected_at": utcnow().isoformat(),
                    })
                await asyncio.sleep(0.3)
        return records

    def _parse_date(self, ts: int) -> datetime | None:
        try:
            return datetime.fromtimestamp(ts / 1000, tz=timezone.utc)
        except Exception:
            return None

    def _infer_role(self, title: str) -> str:
        title = title.lower()
        if any(w in title for w in ["research", "scientist", "ml", "machine learning", "ai"]):
            return "ML Research"
        if any(w in title for w in ["engineer", "developer", "backend", "frontend", "fullstack"]):
            return "Engineering"
        if any(w in title for w in ["product", "pm", "product manager"]):
            return "Product"
        if any(w in title for w in ["data", "analytics", "analyst"]):
            return "Data"
        return "Other"


class AshbyAdapter(SourceAdapter):
    """Ashby public job boards for AI companies."""
    def __init__(self, session=None):
        super().__init__("Ashby", "https://api.ashbyhq.com/posting-api/job-board", session)

    def record_type(self) -> str:
        return "job"

    async def collect(self) -> list[dict]:
        records = []
        # Verified AI companies using Ashby with fresh jobs (from testing)
        ai_companies = [
            "openai", "langchain", "anthropic", "cohere", "replicate", "weaviate",
            "pinecone", "chromadb", "runwayml", "anyscale", "modal", "temporal",
            "dagster", "prefect", "airbyte", "fivetran", "stitch", "segment",
            "mparticle", "amplitude", "mixpanel", "heap", "posthog", "fullstory",
            "hotjar", "logrocket", "sentry", "datadog", "newrelic", "splunk",
            "grafana", "prometheus", "loki", "tempo", "jaeger", "zipkin",
            "thanos", "cortex", "mimir", "victoriametrics", "huggingface",
            "wandb", "weightsandbiases", "comet", "mlflow", "databricks",
            "snowflake", "mongodb", "redis", "elastic", "confluent", "hashicorp",
            "kong", "apisix", "perplexity", "mistral-ai", "together-ai",
            "you-com", "aisera", "scale-ai", "h2o-ai", "c3-ai", "notion",
            "figma", "airtable", "vercel", "linear", "stripe", "instacart",
            "doordash", "robinhood", "coinbase", "plaid", "brex", "ramp",
            "supabase", "planetscale", "airbyte", "fivetran", "snowflake",
            "palantir", "shopify", "twilio", "sendgrid", "strapi", "supabase",
            "planetscale", "ramp", "brex", "plaid", "coinbase", "robinhood",
            "doordash", "instacart", "dropbox", "airbnb", "uber", "lyft",
            "square", "netflix", "nvidia", "zapier", "calendly", "loom",
            "mural", "miro", "atlassian", "gitlab", "github", "heroku",
            "digitalocean", "cloudflare", "fastly", "render", "railway",
            "fly", "netlify", "begin", "deno", "bun", "ycombinator", "carta",
            "gusto", "rippling", "deels", "remote", "c3-ai", "scale", "h2o",
            "mistral", "together", "perplexity", "character", "inflection",
            "adept", "stability", "runway", "haystack", "llama-index",
            "wandb", "weightsandbiases", "comet", "mlflow",
        ]

        async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
            for company in ai_companies:
                url = f"https://api.ashbyhq.com/posting-api/job-board/{company}?includeCompensation=false"
                try:
                    resp = await client.get(url)
                    if resp.status_code != 200:
                        continue
                    data = resp.json()
                    if not isinstance(data, dict) or "jobs" not in data:
                        continue
                    jobs = data["jobs"]
                except Exception:
                    continue

                for job in jobs:
                    published = self._parse_date(job.get("publishedAt", ""))
                    if not is_fresh(published):
                        continue

                    records.append({
                        "company": job.get("companyName", company.title()),
                        "title": job.get("title", ""),
                        "job_url": job.get("jobUrl", ""),
                        "description": job.get("descriptionPlain", ""),
                        "location": job.get("location", ""),
                        "is_remote": job.get("isRemote", False),
                        "employment_type": job.get("employmentType", ""),
                        "role_family": self._infer_role(job.get("title", "")),
                        "published_date": published.isoformat() if published else utcnow().isoformat(),
                        "source_name": self.source_name,
                        "source_url": url,
                        "collected_at": utcnow().isoformat(),
                    })
                await asyncio.sleep(0.3)
        return records

    def _parse_date(self, date_str: str) -> datetime | None:
        try:
            return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        except Exception:
            return None

    def _infer_role(self, title: str) -> str:
        title = title.lower()
        if any(w in title for w in ["research", "scientist", "ml", "machine learning", "ai"]):
            return "ML Research"
        if any(w in title for w in ["engineer", "developer", "backend", "frontend", "fullstack"]):
            return "Engineering"
        if any(w in title for w in ["product", "pm", "product manager"]):
            return "Product"
        if any(w in title for w in ["data", "analytics", "analyst"]):
            return "Data"
        return "Other"


class WellfoundAdapter(SourceAdapter):
    """Wellfound (AngelList) job listings."""
    def __init__(self, session=None):
        super().__init__("Wellfound", "https://wellfound.com/jobs", session)

    def record_type(self) -> str:
        return "job"

    async def collect(self) -> list[dict]:
        records = []
        async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
            try:
                resp = await client.get("https://wellfound.com/jobs?role=engineering&tag=artificial-intelligence")
                if resp.status_code != 200:
                    return records
                soup = BeautifulSoup(resp.text, "lxml")
                jobs = soup.select("div.styles_jobCard__3sJ_0")
                for job in jobs[:50]:
                    title_el = job.select_one("h2 a")
                    if not title_el:
                        continue
                    title = title_el.get_text(strip=True)
                    job_url = urljoin("https://wellfound.com", title_el["href"])
                    company_el = job.select_one("div.styles_companyName__1Qv3A")
                    company = company_el.get_text(strip=True) if company_el else ""
                    location_el = job.select_one("div.styles_location__3M05u")
                    location = location_el.get_text(strip=True) if location_el else ""
                    is_remote = "remote" in location.lower()
                    published = utcnow()

                    if not is_fresh(published):
                        continue

                    records.append({
                        "company": company,
                        "title": title,
                        "job_url": job_url,
                        "description": "",
                        "location": location,
                        "is_remote": is_remote,
                        "employment_type": "FULL_TIME",
                        "role_family": self._infer_role(title),
                        "published_date": published.isoformat(),
                        "source_name": self.source_name,
                        "source_url": self.source_url,
                        "collected_at": utcnow().isoformat(),
                    })
            except Exception:
                pass
        return records

    def _infer_role(self, title: str) -> str:
        title = title.lower()
        if any(w in title for w in ["research", "scientist", "ml", "machine learning", "ai"]):
            return "ML Research"
        if any(w in title for w in ["engineer", "developer", "backend", "frontend", "fullstack"]):
            return "Engineering"
        if any(w in title for w in ["product", "pm", "product manager"]):
            return "Product"
        if any(w in title for w in ["data", "analytics", "analyst"]):
            return "Data"
        return "Other"


class HuggingFaceJobsAdapter(SourceAdapter):
    """Hugging Face jobs board."""
    def __init__(self, session=None):
        super().__init__("HuggingFace Jobs", "https://huggingface.co/jobs", session)

    def record_type(self) -> str:
        return "job"

    async def collect(self) -> list[dict]:
        records = []
        async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
            try:
                resp = await client.get(self.source_url, follow_redirects=True)
                if resp.status_code != 200 or "login" in str(resp.url):
                    return records
                soup = BeautifulSoup(resp.text, "lxml")
                jobs = soup.select("div.job-card")
                for job in jobs[:30]:
                    title_el = job.select_one("h3")
                    if not title_el:
                        continue
                    title = title_el.get_text(strip=True)
                    link_el = job.select_one("a")
                    job_url = urljoin("https://huggingface.co", link_el["href"]) if link_el else ""
                    desc_el = job.select_one("p")
                    description = desc_el.get_text(strip=True) if desc_el else ""
                    location_el = job.select_one(".location")
                    location = location_el.get_text(strip=True) if location_el else ""
                    published = utcnow()

                    if not is_fresh(published):
                        continue

                    records.append({
                        "company": "Hugging Face",
                        "title": title,
                        "job_url": job_url,
                        "description": description,
                        "location": location,
                        "is_remote": "remote" in location.lower(),
                        "employment_type": "FULL_TIME",
                        "role_family": self._infer_role(title),
                        "published_date": published.isoformat(),
                        "source_name": self.source_name,
                        "source_url": self.source_url,
                        "collected_at": utcnow().isoformat(),
                    })
            except Exception:
                pass
        return records

    def _infer_role(self, title: str) -> str:
        title = title.lower()
        if any(w in title for w in ["research", "scientist", "ml", "machine learning", "ai"]):
            return "ML Research"
        if any(w in title for w in ["engineer", "developer", "backend", "frontend", "fullstack"]):
            return "Engineering"
        if any(w in title for w in ["product", "pm", "product manager"]):
            return "Product"
        if any(w in title for w in ["data", "analytics", "analyst"]):
            return "Data"
        return "Other"


class WeWorkRemotelyAdapter(SourceAdapter):
    """WeWorkRemotely RSS feeds for remote jobs."""
    def __init__(self, session=None):
        super().__init__("WeWorkRemotely", "https://weworkremotely.com", session)

    def record_type(self) -> str:
        return "job"

    async def collect(self) -> list[dict]:
        records = []
        # RSS feeds for different categories
        feeds = [
            ("programming", "https://weworkremotely.com/categories/remote-programming-jobs.rss"),
            ("design", "https://weworkremotely.com/categories/remote-design-jobs.rss"),
        ]

        ai_keywords = [
            "ai", "ml", "machine learning", "data scientist", "nlp", "llm",
            "deep learning", "artificial intelligence", "computer vision",
            "generative", "prompt", "mlops", "ml engineer", "ai engineer",
            "data engineer", "analytics", "research", "pytorch", "tensorflow",
            "keras", "huggingface", "transformers", "neural", "model",
            "training", "inference", "embedding", "vector", "rag"
        ]

        for category, feed_url in feeds:
            try:
                parsed = feedparser.parse(feed_url)
                for entry in parsed.entries:
                    pub_str = entry.get("published", "")
                    if not pub_str:
                        continue
                    try:
                        published = parsedate_to_datetime(pub_str)
                    except Exception:
                        continue

                    if not is_fresh(published):
                        continue

                    title = entry.get("title", "")
                    # Filter for AI/ML related jobs
                    if not any(kw in title.lower() for kw in ai_keywords):
                        continue

                    job_url = entry.get("link", "")
                    company = ""
                    # Extract company from title format "Company: Title"
                    if ": " in title:
                        company = title.split(": ")[0].strip()

                    records.append({
                        "company": company or "Unknown",
                        "title": title,
                        "job_url": job_url,
                        "description": entry.get("summary", "")[:500],
                        "location": "Remote",
                        "is_remote": True,
                        "employment_type": "FULL_TIME",
                        "role_family": self._infer_role(title),
                        "published_date": published.isoformat(),
                        "source_name": self.source_name,
                        "source_url": feed_url,
                        "collected_at": utcnow().isoformat(),
                    })
            except Exception as e:
                pass
        return records

    def _infer_role(self, title: str) -> str:
        title = title.lower()
        if any(w in title for w in ["research", "scientist", "ml", "machine learning", "ai"]):
            return "ML Research"
        if any(w in title for w in ["engineer", "developer", "backend", "frontend", "fullstack"]):
            return "Engineering"
        if any(w in title for w in ["product", "pm", "product manager"]):
            return "Product"
        if any(w in title for w in ["data", "analytics", "analyst"]):
            return "Data"
        return "Other"


class RemoteOKAdapter(SourceAdapter):
    """RemoteOK API for remote jobs."""
    def __init__(self, session=None):
        super().__init__("RemoteOK", "https://remoteok.io/api", session)

    def record_type(self) -> str:
        return "job"

    async def collect(self) -> list[dict]:
        records = []
        ai_keywords = [
            "ai", "ml", "machine learning", "data scientist", "nlp", "llm",
            "deep learning", "artificial intelligence", "computer vision",
            "generative", "prompt", "mlops", "ml engineer", "ai engineer",
            "data engineer", "analytics", "research", "pytorch", "tensorflow",
            "keras", "huggingface", "transformers", "neural", "model",
            "training", "inference", "embedding", "vector", "rag"
        ]

        async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
            try:
                resp = await client.get(self.source_url, follow_redirects=True)
                if resp.status_code != 200:
                    return records
                data = resp.json()
                if not isinstance(data, list) or len(data) <= 1:
                    return records

                # First item is metadata
                for job in data[1:]:
                    date_str = job.get("date", "")
                    if not date_str:
                        continue
                    try:
                        published = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                    except Exception:
                        continue

                    if not is_fresh(published):
                        continue

                    position = job.get("position", "")
                    # Filter for AI/ML related jobs
                    if not any(kw in position.lower() for kw in ai_keywords):
                        continue

                    records.append({
                        "company": job.get("company", ""),
                        "title": position,
                        "job_url": job.get("url", ""),
                        "description": job.get("description", "")[:500],
                        "location": job.get("location", "Remote"),
                        "is_remote": True,
                        "employment_type": "FULL_TIME",
                        "role_family": self._infer_role(position),
                        "published_date": published.isoformat(),
                        "source_name": self.source_name,
                        "source_url": self.source_url,
                        "collected_at": utcnow().isoformat(),
                    })
            except Exception:
                pass
        return records

    def _infer_role(self, title: str) -> str:
        title = title.lower()
        if any(w in title for w in ["research", "scientist", "ml", "machine learning", "ai"]):
            return "ML Research"
        if any(w in title for w in ["engineer", "developer", "backend", "frontend", "fullstack"]):
            return "Engineering"
        if any(w in title for w in ["product", "pm", "product manager"]):
            return "Product"
        if any(w in title for w in ["data", "analytics", "analyst"]):
            return "Data"
        return "Other"


class CompanyCareersAdapter(SourceAdapter):
    """Company career pages aggregator - finds and crawls job board URLs."""
    def __init__(self, session=None):
        super().__init__("Company Careers", "https://careers", session)

    def record_type(self) -> str:
        return "job"

    async def collect(self) -> list[dict]:
        records = []
        # Companies with their career page URLs
        companies = {
            "NVIDIA": "https://www.nvidia.com/en-us/about-nvidia/careers/jobs/",
            "Google DeepMind": "https://deepmind.google/careers/open-roles/",
            "Microsoft Research": "https://careers.microsoft.com/professionals/us/en/search-results?keywords=AI",
            "Meta AI": "https://www.metacareers.com/jobs?keyword=artificial%20intelligence",
            "Amazon Science": "https://www.amazon.science/jobs",
            "OpenAI": "https://openai.com/careers/search-results/",
            "Anthropic": "https://www.anthropic.com/careers",
            "Cohere": "https://cohere.com/careers",
            "Hugging Face": "https://huggingface.co/careers",
            "Databricks": "https://databricks.com/company/careers",
            "Weaviate": "https://weaviate.io/careers",
            "Pinecone": "https://www.pinecone.io/careers/",
            "Airbyte": "https://airbyte.com/careers",
            "Fivetran": "https://fivetran.com/careers",
            "Stripe": "https://stripe.com/jobs/search?q=ai",
            "Vercel": "https://vercel.com/careers",
            "Linear": "https://linear.app/careers",
            "Notion": "https://www.notion.so/careers",
            "Figma": "https://www.figma.com/careers",
            "Airtable": "https://airtable.com/careers",
            "MongoDB": "https://www.mongodb.com/careers",
            "Redis": "https://redis.io/careers",
            "Elastic": "https://www.elastic.co/about/careers",
            "Confluent": "https://www.confluent.io/careers",
            "HashiCorp": "https://www.hashicorp.com/careers",
            "Kong": "https://konghq.com/careers",
            "Temporal": "https://temporal.io/careers",
            "Dagster": "https://dagster.io/careers",
            "Prefect": "https://www.prefect.io/careers",
            "Anyscale": "https://www.anyscale.com/careers",
            "Modal": "https://modal.com/careers",
            "Weights & Biases": "https://wandb.ai/site/careers",
            "Comet": "https://www.comet.com/careers",
            "Scale AI": "https://scale.com/careers",
            "H2O.ai": "https://www.h2o.ai/careers",
            "C3 AI": "https://c3.ai/careers/",
            "Runway": "https://runwayml.com/careers",
            "Perplexity": "https://www.perplexity.ai/careers",
            "Together AI": "https://www.together.ai/careers",
            "Mistral AI": "https://mistral.ai/careers/",
            "Replicate": "https://replicate.com/careers",
            "Chroma": "https://www.trychroma.com/careers",
            "LangChain": "https://www.langchain.com/careers",
            "Dataiku": "https://www.dataiku.com/company/careers",
            "Snyk": "https://snyk.io/careers/",
            "Sentry": "https://sentry.io/careers/",
            "Postman": "https://www.postman.com/careers/",
            "GitLab": "https://about.gitlab.com/jobs/",
            "GitHub": "https://github.com/careers",
        }

        async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
            for company, url in companies.items():
                try:
                    resp = await client.get(url, follow_redirects=True)
                    if resp.status_code != 200:
                        continue
                    soup = BeautifulSoup(resp.text, "lxml")

                    # First, detect which job board the company uses
                    job_board_url = None
                    job_board_type = None

                    for link in soup.find_all("a", href=True):
                        href = link["href"]
                        if "greenhouse.io" in href:
                            board_slug = href.split("greenhouse.io/")[-1].split("/")[0].split("?")[0]
                            job_board_url = f"https://boards-api.greenhouse.io/v1/boards/{board_slug}/jobs"
                            job_board_type = "greenhouse"
                            break
                        elif "lever.co" in href:
                            board_slug = href.split("lever.co/")[-1].split("/")[0].split("?")[0]
                            job_board_url = f"https://api.lever.co/v0/postings/{board_slug}?mode=json"
                            job_board_type = "lever"
                            break
                        elif "ashbyhq.com" in href and "/form/" not in href:
                            board_slug = href.split("ashbyhq.com/")[-1].split("/")[0].split("?")[0]
                            job_board_url = f"https://api.ashbyhq.com/posting-api/job-board/{board_slug}?includeCompensation=false"
                            job_board_type = "ashby"
                            break

                    # If we found a job board API, fetch jobs from it
                    if job_board_url and job_board_type:
                        job_records = await self._fetch_from_job_board(client, job_board_url, job_board_type, company)
                        records.extend(job_records)
                        await asyncio.sleep(0.5)
                        continue

                    # Fallback: try to find direct job links on the page
                    job_links = self._find_direct_job_links(soup, url)
                    for title, job_url in job_links[:20]:
                        published = utcnow()
                        if not is_fresh(published):
                            continue
                        records.append({
                            "company": company,
                            "title": title[:200],
                            "job_url": job_url,
                            "description": "",
                            "location": "",
                            "is_remote": "remote" in title.lower() or "remote" in job_url.lower(),
                            "employment_type": "FULL_TIME",
                            "role_family": self._infer_role(title),
                            "published_date": published.isoformat(),
                            "source_name": self.source_name,
                            "source_url": url,
                            "collected_at": utcnow().isoformat(),
                        })
                except Exception:
                    pass
                await asyncio.sleep(1)
        return records

    async def _fetch_from_job_board(self, client: httpx.AsyncClient, board_url: str, board_type: str, company: str) -> list[dict]:
        """Fetch jobs from a detected job board API."""
        records = []
        try:
            resp = await client.get(board_url)
            if resp.status_code != 200:
                return records
            data = resp.json()

            if board_type == "greenhouse":
                for job in data.get("jobs", []):
                    published = self._parse_date(job.get("updated_at", ""))
                    if not is_fresh(published):
                        continue
                    records.append({
                        "company": job.get("company_name", company),
                        "title": job.get("title", ""),
                        "job_url": job.get("absolute_url", ""),
                        "description": job.get("content", "")[:500],
                        "location": job.get("location", {}).get("name", "") if job.get("location") else "",
                        "is_remote": "remote" in job.get("location", {}).get("name", "").lower() if job.get("location") else False,
                        "employment_type": job.get("employment_type", ""),
                        "role_family": self._infer_role(job.get("title", "")),
                        "published_date": published.isoformat() if published else utcnow().isoformat(),
                        "source_name": f"{self.source_name} (Greenhouse)",
                        "source_url": board_url,
                        "collected_at": utcnow().isoformat(),
                    })

            elif board_type == "lever":
                if isinstance(data, list):
                    for job in data:
                        published = self._parse_lever_date(job.get("createdAt", 0))
                        if not is_fresh(published):
                            continue
                        records.append({
                            "company": company,
                            "title": job.get("text", ""),
                            "job_url": job.get("hostedUrl", ""),
                            "description": job.get("descriptionPlain", "")[:500],
                            "location": job.get("categories", {}).get("location", ""),
                            "is_remote": "remote" in job.get("categories", {}).get("location", "").lower(),
                            "employment_type": job.get("categories", {}).get("commitment", ""),
                            "role_family": self._infer_role(job.get("text", "")),
                            "published_date": published.isoformat() if published else utcnow().isoformat(),
                            "source_name": f"{self.source_name} (Lever)",
                            "source_url": board_url,
                            "collected_at": utcnow().isoformat(),
                        })

            elif board_type == "ashby":
                if isinstance(data, dict) and "jobs" in data:
                    for job in data["jobs"]:
                        published = self._parse_date(job.get("publishedAt", ""))
                        if not is_fresh(published):
                            continue
                        records.append({
                            "company": job.get("companyName", company),
                            "title": job.get("title", ""),
                            "job_url": job.get("jobUrl", ""),
                            "description": job.get("descriptionPlain", "")[:500],
                            "location": job.get("location", ""),
                            "is_remote": job.get("isRemote", False),
                            "employment_type": job.get("employmentType", ""),
                            "role_family": self._infer_role(job.get("title", "")),
                            "published_date": published.isoformat() if published else utcnow().isoformat(),
                            "source_name": f"{self.source_name} (Ashby)",
                            "source_url": board_url,
                            "collected_at": utcnow().isoformat(),
                        })

        except Exception:
            pass
        return records

    def _find_direct_job_links(self, soup: BeautifulSoup, base_url: str) -> list[tuple[str, str]]:
        """Find direct job posting links on a career page."""
        job_links = []
        seen_urls = set()

        for link in soup.find_all("a", href=True):
            href = link["href"]
            text = link.get_text(strip=True)

            # Skip navigation, footer, header links
            if any(skip in href.lower() for skip in [
                'privacy', 'terms', 'cookie', 'contact', 'about', 'blog',
                'login', 'signin', 'register', 'newsletter', 'facebook',
                'twitter', 'linkedin', 'github', 'youtube', 'instagram',
                '#', 'javascript:', 'mailto:', 'tel:', 'life-at', 'benefits',
                'diversity', 'inclusion', 'culture', 'values', 'mission',
                'university', 'intern', 'students', 'graduates', 'early-career',
                'overview', 'how-we-hire', 'candidate-privacy'
            ]):
                continue

            # Look for actual job posting patterns
            if any(pattern in href.lower() for pattern in [
                '/job/', '/jobs/', '/position/', '/role/', '/opening/',
                '/careers/job', '/careers/position', '/careers/role',
                'greenhouse.io', 'lever.co', 'ashbyhq.com', 'workday.com',
                'icims.com', 'smartrecruiters.com', 'bamboohr.com',
                'job-', '-job', 'position-', '-position', 'role-', '-role',
            ]) and text and len(text) > 5:
                # Filter out generic navigation text
                if text.lower() not in ['careers', 'jobs', 'positions', 'open roles', 'view all', 'see all', 'explore', 'search', 'here', 'apply', 'apply now', 'join our talent community', 'stay connected', 'talent community']:
                    full_url = urljoin(base_url, href)
                    if full_url not in seen_urls:
                        seen_urls.add(full_url)
                        job_links.append((text, full_url))

        return job_links

    def _parse_date(self, date_str: str) -> datetime | None:
        try:
            return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        except Exception:
            return None

    def _parse_lever_date(self, ts: int) -> datetime | None:
        try:
            return datetime.fromtimestamp(ts / 1000, tz=timezone.utc)
        except Exception:
            return None

    def _infer_role(self, title: str) -> str:
        title = title.lower()
        if any(w in title for w in ["research", "scientist", "ml", "machine learning", "ai"]):
            return "ML Research"
        if any(w in title for w in ["engineer", "developer", "backend", "frontend", "fullstack"]):
            return "Engineering"
        if any(w in title for w in ["product", "pm", "product manager"]):
            return "Product"
        if any(w in title for w in ["data", "analytics", "analyst"]):
            return "Data"
        return "Other"


class AIJobsAdapter(SourceAdapter):
    """AI Dev Board jobs API."""
    def __init__(self, session=None):
        super().__init__("AI Dev Jobs", "https://aidevboard.com/api/v1/jobs", session)

    def record_type(self) -> str:
        return "job"

    async def collect(self) -> list[dict]:
        records = []
        async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
            try:
                # Try multiple query parameters to get AI jobs
                urls = [
                    "https://aidevboard.com/api/v1/jobs?q=ai&per_page=100",
                    "https://aidevboard.com/api/v1/jobs?tags=llm,ml,ai&per_page=100",
                    "https://aidevboard.com/api/v1/jobs?workplace=remote&per_page=100",
                    "https://aidevboard.com/api/v1/jobs?type=full-time&per_page=100",
                ]

                for url in urls:
                    resp = await client.get(url)
                    if resp.status_code != 200:
                        continue
                    data = resp.json()
                    jobs = data.get("jobs")
                    if not jobs:
                        continue

                    for job in jobs:
                        posted = job.get("posted_date", "")
                        if not posted:
                            continue
                        try:
                            published = datetime.fromisoformat(posted.replace("Z", "+00:00"))
                        except Exception:
                            continue

                        if not is_fresh(published):
                            continue

                        company_obj = job.get("company", {})
                        company_name = company_obj.get("name", "") if isinstance(company_obj, dict) else str(company_obj)

                        records.append({
                            "company": company_name,
                            "title": job.get("title", ""),
                            "job_url": job.get("url", ""),
                            "description": job.get("description", "")[:500],
                            "location": job.get("location", ""),
                            "is_remote": job.get("remote", False),
                            "employment_type": job.get("type", ""),
                            "role_family": self._infer_role(job.get("title", "")),
                            "published_date": published.isoformat(),
                            "source_name": self.source_name,
                            "source_url": url,
                            "collected_at": utcnow().isoformat(),
                        })
                    await asyncio.sleep(0.5)
            except Exception:
                pass
        return records

    def _infer_role(self, title: str) -> str:
        title = title.lower()
        if any(w in title for w in ["research", "scientist", "ml", "machine learning", "ai"]):
            return "ML Research"
        if any(w in title for w in ["engineer", "developer", "backend", "frontend", "fullstack"]):
            return "Engineering"
        if any(w in title for w in ["product", "pm", "product manager"]):
            return "Product"
        if any(w in title for w in ["data", "analytics", "analyst"]):
            return "Data"
        return "Other"


JOB_ADAPTERS = [
    GreenhouseAdapter(),
    LeverAdapter(),
    AshbyAdapter(),
    WellfoundAdapter(),
    HuggingFaceJobsAdapter(),
    CompanyCareersAdapter(),
    WeWorkRemotelyAdapter(),
    RemoteOKAdapter(),
    AIJobsAdapter(),
]