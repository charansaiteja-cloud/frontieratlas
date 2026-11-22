"""Startup source adapters."""
import asyncio
import json
import re
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from app.crawlers import SourceAdapter
from app.config import settings


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class YCombinatorAdapter(SourceAdapter):
    """YC public company directory."""
    def __init__(self, session=None):
        super().__init__("YCombinator", "https://www.ycombinator.com/companies")
        self.session = session

    def record_type(self) -> str:
        return "startup"

    async def collect(self) -> list[dict]:
        records = []
        async with self._get_session() as session:
            for batch in range(0, 5):
                url = f"https://www.ycombinator.com/companies?batch=W24&page={batch+1}"
                try:
                    async with session.get(url) as resp:
                        html = await resp.text()
                except Exception:
                    break
                soup = BeautifulSoup(html, "lxml")
                cards = soup.select("div._company_86jzd_1")
                if not cards:
                    break
                for card in cards:
                    name_el = card.select_one("span._coName_86jzd_1")
                    if not name_el:
                        continue
                    name = name_el.get_text(strip=True)
                    desc_el = card.select_one("div._coDescription_86jzd_1")
                    description = desc_el.get_text(strip=True) if desc_el else None
                    link_el = card.select_one("a")
                    website = urljoin("https://www.ycombinator.com", link_el["href"]) if link_el else None
                    records.append({
                        "entity_name": name,
                        "description": description,
                        "website": website,
                        "industry": "AI",
                        "headquarters": None,
                        "employee_count": None,
                        "founding_year": None,
                        "source_name": self.source_name,
                        "source_url": url,
                        "collected_at": utcnow().isoformat(),
                    })
                await asyncio.sleep(1)
        return records

    def _get_session(self):
        import aiohttp
        timeout = aiohttp.ClientTimeout(total=settings.request_timeout)
        return aiohttp.ClientSession(timeout=timeout)


class HuggingFaceOrgsAdapter(SourceAdapter):
    """Hugging Face organization listings."""
    def __init__(self, session=None):
        super().__init__("HuggingFace", "https://huggingface.co/organizations")
        self.session = session

    def record_type(self) -> str:
        return "startup"

    async def collect(self) -> list[dict]:
        records = []
        async with self._get_session() as session:
            for page in range(1, 6):
                url = f"https://huggingface.co/organizations?page={page}"
                try:
                    async with session.get(url) as resp:
                        html = await resp.text()
                except Exception:
                    break
                soup = BeautifulSoup(html, "lxml")
                cards = soup.select("article.organization-card")
                if not cards:
                    break
                for card in cards:
                    name_el = card.select_one("h4 a")
                    if not name_el:
                        continue
                    name = name_el.get_text(strip=True)
                    website = urljoin("https://huggingface.co", name_el["href"])
                    desc_el = card.select_one("p")
                    description = desc_el.get_text(strip=True) if desc_el else None
                    records.append({
                        "entity_name": name,
                        "description": description,
                        "website": website,
                        "industry": "AI/ML",
                        "headquarters": None,
                        "employee_count": None,
                        "founding_year": None,
                        "source_name": self.source_name,
                        "source_url": url,
                        "collected_at": utcnow().isoformat(),
                    })
                await asyncio.sleep(1)
        return records

    def _get_session(self):
        import aiohttp
        timeout = aiohttp.ClientTimeout(total=settings.request_timeout)
        return aiohttp.ClientSession(timeout=timeout)


class StartupDirectoryAdapter(SourceAdapter):
    """Generic startup directory via API."""
    def __init__(self, name: str, url: str, session=None):
        super().__init__(name, url, session)

    def record_type(self) -> str:
        return "startup"

    async def collect(self) -> list[dict]:
        return []


STARTUP_ADAPTERS = [
    YCombinatorAdapter(),
    HuggingFaceOrgsAdapter(),
]