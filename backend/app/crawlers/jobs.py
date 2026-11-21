"""Job source adapters with 24-hour freshness filter."""
import asyncio
import json
import re
from datetime import datetime, timezone, timedelta
from typing import Any

import httpx
from bs4 import BeautifulSoup

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
        ai_companies = [
            "openai", "anthropic", "cohere", "stability-ai", "huggingface",
            "replicate", "weaviate", "pinecone", "chromadb", "langchain",
        ]
        
        async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
            for company in ai_companies:
                url = f"https://boards-api.greenhouse.io/v1/boards/{company}/jobs"
                try:
                    resp = await client.get(url)
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
                await asyncio.sleep(0.5)
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
    """Lever public job postings."""
    def __init__(self, session=None):
        super().__init__("Lever", "https://api.lever.co/v0/postings", session)

    def record_type(self) -> str:
        return "job"

    async def collect(self) -> list[dict]:
        records = []
        ai_companies = [
            "anthropic", "cohere", "stabilityai", "huggingface", "replicate",
            "weaviate", "pinecone", "chromadb", "langchain", "vercel",
        ]
        
        async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
            for company in ai_companies:
                url = f"https://api.lever.co/v0/postings/{company}?mode=json"
                try:
                    resp = await client.get(url)
                    data = resp.json()
                except Exception:
                    continue
                
                for job in data:
                    published = self._parse_date(job.get("createdAt", 0))
                    if not is_fresh(published):
                        continue
                    
                    records.append({
                        "company": company.title(),
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
                await asyncio.sleep(0.5)
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
                resp = await client.get(self.source_url)
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


class CompanyCareersAdapter(SourceAdapter):
    """Company career pages aggregator."""
    def __init__(self, session=None):
        super().__init__("Company Careers", "https://careers", session)

    def record_type(self) -> str:
        return "job"

    async def collect(self) -> list[dict]:
        records = []
        companies = {
            "NVIDIA": "https://www.nvidia.com/en-us/about-nvidia/careers/",
            "Google DeepMind": "https://deepmind.google/careers/",
            "Microsoft Research": "https://careers.microsoft.com/",
            "Meta AI": "https://www.metacareers.com/",
            "Amazon Science": "https://www.amazon.science/jobs",
        }
        
        async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
            for company, url in companies.items():
                try:
                    resp = await client.get(url)
                    soup = BeautifulSoup(resp.text, "lxml")
                    job_links = soup.select("a[href*='job'], a[href*='career'], a[href*='position']")
                    for link in job_links[:10]:
                        title = link.get_text(strip=True)
                        job_url = urljoin(url, link["href"])
                        published = utcnow()
                        if not is_fresh(published):
                            continue
                        records.append({
                            "company": company,
                            "title": title,
                            "job_url": job_url,
                            "description": "",
                            "location": "",
                            "is_remote": False,
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


from app.crawlers.api_sources import AIJobsAdapter

JOB_ADAPTERS = [
    GreenhouseAdapter(),
    LeverAdapter(),
    WellfoundAdapter(),
    HuggingFaceJobsAdapter(),
    CompanyCareersAdapter(),
    AIJobsAdapter(),
]