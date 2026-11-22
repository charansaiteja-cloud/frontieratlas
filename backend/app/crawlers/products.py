"""Product source adapters."""
import asyncio
import re
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from app.crawlers import SourceAdapter
from app.config import settings


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ProductHuntAIAdapter(SourceAdapter):
    """Product Hunt AI category."""
    def __init__(self, session=None):
        super().__init__("ProductHunt AI", "https://www.producthunt.com/topics/artificial-intelligence")
        self.session = session

    def record_type(self) -> str:
        return "product"

    async def collect(self) -> list[dict]:
        records = []
        async with self._get_session() as session:
            url = self.source_url
            try:
                async with session.get(url) as resp:
                    html = await resp.text()
            except Exception:
                return records
            soup = BeautifulSoup(html, "lxml")
            cards = soup.select("div.styles_item__3xJ1L")
            for card in cards[:50]:
                name_el = card.select_one("h3 a") or card.select_one("a[data-test='product-name']")
                if not name_el:
                    continue
                name = name_el.get_text(strip=True)
                product_url = urljoin("https://www.producthunt.com", name_el["href"])
                desc_el = card.select_one("p") or card.select_one("div.styles_tagline__2QKJc")
                description = desc_el.get_text(strip=True) if desc_el else None
                startup_el = card.select_one("a.styles_maker__1HmJY")
                startup_name = startup_el.get_text(strip=True) if startup_el else None
                records.append({
                    "product_name": name,
                    "product_url": product_url,
                    "description": description,
                    "startup_name": startup_name,
                    "pricing_model": "UNKNOWN",
                    "source_name": self.source_name,
                    "source_url": url,
                    "collected_at": utcnow().isoformat(),
                })
        return records

    def _get_session(self):
        import aiohttp
        timeout = aiohttp.ClientTimeout(total=settings.request_timeout)
        return aiohttp.ClientSession(timeout=timeout)


class FuturepediaAdapter(SourceAdapter):
    """Futurepedia AI tools directory."""
    def __init__(self, session=None):
        super().__init__("Futurepedia", "https://www.futurepedia.io/ai-tools")
        self.session = session

    def record_type(self) -> str:
        return "product"

    async def collect(self) -> list[dict]:
        records = []
        async with self._get_session() as session:
            for page in range(1, 4):
                url = f"{self.source_url}?page={page}"
                try:
                    async with session.get(url) as resp:
                        html = await resp.text()
                except Exception:
                    break
                soup = BeautifulSoup(html, "lxml")
                cards = soup.select("div.tool-card")
                if not cards:
                    break
                for card in cards:
                    name_el = card.select_one("h3 a")
                    if not name_el:
                        continue
                    name = name_el.get_text(strip=True)
                    product_url = urljoin("https://www.futurepedia.io", name_el["href"])
                    desc_el = card.select_one("p")
                    description = desc_el.get_text(strip=True) if desc_el else None
                    pricing_el = card.select_one(".pricing-tag")
                    pricing = "UNKNOWN"
                    if pricing_el:
                        text = pricing_el.get_text(strip=True).lower()
                        if "free" in text and "freemium" not in text:
                            pricing = "FREE"
                        elif "freemium" in text:
                            pricing = "FREEMIUM"
                        elif "enterprise" in text:
                            pricing = "ENTERPRISE"
                        else:
                            pricing = "PAID"
                    records.append({
                        "product_name": name,
                        "product_url": product_url,
                        "description": description,
                        "startup_name": None,
                        "pricing_model": pricing,
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


class AIToolsDirectoryAdapter(SourceAdapter):
    """AI Tools Directory."""
    def __init__(self, session=None):
        super().__init__("AI Tools Directory", "https://www.aitoolsdirectory.com/tools")
        self.session = session

    def record_type(self) -> str:
        return "product"

    async def collect(self) -> list[dict]:
        records = []
        async with self._get_session() as session:
            try:
                async with session.get(self.source_url) as resp:
                    html = await resp.text()
            except Exception:
                return records
            soup = BeautifulSoup(html, "lxml")
            cards = soup.select("div.tool-item")
            for card in cards[:50]:
                name_el = card.select_one("h3 a")
                if not name_el:
                    continue
                name = name_el.get_text(strip=True)
                product_url = urljoin("https://www.aitoolsdirectory.com", name_el["href"])
                desc_el = card.select_one("p")
                description = desc_el.get_text(strip=True) if desc_el else None
                records.append({
                    "product_name": name,
                    "product_url": product_url,
                    "description": description,
                    "startup_name": None,
                    "pricing_model": "UNKNOWN",
                    "source_name": self.source_name,
                    "source_url": self.source_url,
                    "collected_at": utcnow().isoformat(),
                })
        return records

    def _get_session(self):
        import aiohttp
        timeout = aiohttp.ClientTimeout(total=settings.request_timeout)
        return aiohttp.ClientSession(timeout=timeout)


class HuggingFaceSpacesAdapter(SourceAdapter):
    """Hugging Face Spaces as AI products."""
    def __init__(self, session=None):
        super().__init__("HuggingFace Spaces", "https://huggingface.co/spaces")
        self.session = session

    def record_type(self) -> str:
        return "product"

    async def collect(self) -> list[dict]:
        records = []
        async with self._get_session() as session:
            for page in range(1, 4):
                url = f"https://huggingface.co/spaces?page={page}&sort=trending"
                try:
                    async with session.get(url) as resp:
                        html = await resp.text()
                except Exception:
                    break
                soup = BeautifulSoup(html, "lxml")
                cards = soup.select("article.space-card")
                if not cards:
                    break
                for card in cards:
                    name_el = card.select_one("h4 a")
                    if not name_el:
                        continue
                    name = name_el.get_text(strip=True)
                    product_url = urljoin("https://huggingface.co", name_el["href"])
                    desc_el = card.select_one("p")
                    description = desc_el.get_text(strip=True) if desc_el else None
                    org_el = card.select_one("span a")
                    startup_name = org_el.get_text(strip=True) if org_el else None
                    records.append({
                        "product_name": name,
                        "product_url": product_url,
                        "description": description,
                        "startup_name": startup_name,
                        "pricing_model": "FREE",
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


class ThereIsAnAIForThatAdapter(SourceAdapter):
    """There's An AI For That."""
    def __init__(self, session=None):
        super().__init__("ThereIsAnAIForThat", "https://theresanaiforthat.com")
        self.session = session

    def record_type(self) -> str:
        return "product"

    async def collect(self) -> list[dict]:
        records = []
        async with self._get_session() as session:
            try:
                async with session.get(self.source_url) as resp:
                    html = await resp.text()
            except Exception:
                return records
            soup = BeautifulSoup(html, "lxml")
            cards = soup.select("div.tool-card")
            for card in cards[:50]:
                name_el = card.select_one("h3 a")
                if not name_el:
                    continue
                name = name_el.get_text(strip=True)
                product_url = urljoin("https://theresanaiforthat.com", name_el["href"])
                desc_el = card.select_one("p")
                description = desc_el.get_text(strip=True) if desc_el else None
                records.append({
                    "product_name": name,
                    "product_url": product_url,
                    "description": description,
                    "startup_name": None,
                    "pricing_model": "UNKNOWN",
                    "source_name": self.source_name,
                    "source_url": self.source_url,
                    "collected_at": utcnow().isoformat(),
                })
        return records

    def _get_session(self):
        import aiohttp
        timeout = aiohttp.ClientTimeout(total=settings.request_timeout)
        return aiohttp.ClientSession(timeout=timeout)


PRODUCT_ADAPTERS = [
    ProductHuntAIAdapter(),
    FuturepediaAdapter(),
    AIToolsDirectoryAdapter(),
    HuggingFaceSpacesAdapter(),
    ThereIsAnAIForThatAdapter(),
]
class ProductHuntAdapter(SourceAdapter):
    """Product Hunt website scraper for commercial products."""
    def __init__(self, session=None):
        super().__init__("ProductHunt", "https://www.producthunt.com", session)

    def record_type(self) -> str:
        return "product"

    async def collect(self) -> list[dict]:
        records = []
        async with self._get_session() as session:
            # Product Hunt new page - no API key needed for basic scraping
            for page in range(1, 4):  # 3 pages
                url = f"https://www.producthunt.com/posts?page={page}"
                try:
                    async with session.get(url) as resp:
                        html = await resp.text()
                except Exception:
                    break
                if not html or len(html) < 1000:
                    break
                # Simple parsing - look for product cards
                # Product Hunt uses specific CSS classes
                import re
                # Find product entries
                entries = re.findall(r'<div class="Post__StyledPost[^"]*".*?<h3[^>]*>(.*?)</h3>.*?<a[^>]*href="([^"]*)"[^>]*>(.*?)</a>', html, re.DOTALL)
                for entry in entries[:10]:  # Limit per page
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
                await asyncio.sleep(2)  # Rate limiting
        return records

    def _get_session(self):
        import aiohttp
        timeout = aiohttp.ClientTimeout(total=settings.request_timeout)
        return aiohttp.ClientSession(timeout=timeout)
