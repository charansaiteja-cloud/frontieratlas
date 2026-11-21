"""Async crawler framework with rate limiting, retries, and checkpointing."""
import asyncio
import hashlib
import json
import random
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional
from urllib.parse import urljoin, urlparse

import aiohttp
import httpx
from loguru import logger
from tenacity import (
    retry, stop_after_attempt, wait_exponential_jitter,
    retry_if_exception_type, retry_if_result
)

from app.config import settings


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class CrawlResult:
    url: str
    status: int
    content: str
    headers: dict
    content_hash: str
    fetched_at: datetime
    error: Optional[str] = None


@dataclass
class DomainState:
    semaphore: asyncio.Semaphore
    last_request: float = 0
    request_count: int = 0


class RateLimiter:
    def __init__(self, max_concurrency: int, per_domain_concurrency: int):
        self.global_semaphore = asyncio.Semaphore(max_concurrency)
        self.domain_states: dict[str, DomainState] = {}
        self.per_domain_limit = per_domain_concurrency
        self._lock = asyncio.Lock()

    async def acquire(self, url: str):
        await self.global_semaphore.acquire()
        domain = urlparse(url).netloc
        async with self._lock:
            if domain not in self.domain_states:
                self.domain_states[domain] = DomainState(semaphore=asyncio.Semaphore(self.per_domain_limit))
            state = self.domain_states[domain]
        await state.semaphore.acquire()
        return state

    def release(self, url: str, state: DomainState):
        state.semaphore.release()
        self.global_semaphore.release()


class BaseCrawler(ABC):
    def __init__(self, source_name: str, source_url: str):
        self.source_name = source_name
        self.source_url = source_url
        self.rate_limiter = RateLimiter(settings.max_concurrency, settings.per_domain_concurrency)
        self.session: Optional[aiohttp.ClientSession] = None
        self.playwright_browser = None
        self.stats = {"fetched": 0, "failed": 0, "blocked": 0}

    async def __aenter__(self):
        timeout = aiohttp.ClientTimeout(total=settings.request_timeout)
        connector = aiohttp.TCPConnector(limit=settings.max_concurrency, limit_per_host=settings.per_domain_concurrency)
        self.session = aiohttp.ClientSession(timeout=timeout, connector=connector)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def _fetch_with_playwright(self, url: str) -> CrawlResult:
        if not self.playwright_browser:
            from playwright.async_api import async_playwright
            p = await async_playwright().start()
            self.playwright_browser = await p.chromium.launch(headless=True)
        page = await self.playwright_browser.new_page()
        try:
            response = await page.goto(url, wait_until="networkidle", timeout=settings.request_timeout * 1000)
            content = await page.content()
            headers = dict(response.headers) if response else {}
            status = response.status if response else 0
        except Exception as e:
            await page.close()
            raise
        await page.close()
        content_hash = hashlib.sha256(content.encode()).hexdigest()
        return CrawlResult(url, status, content, headers, content_hash, utcnow())

    @retry(
        wait=wait_exponential_jitter(initial=1, max=30, jitter=2),
        stop=stop_after_attempt(3),
        retry=retry_if_exception_type((aiohttp.ClientError, asyncio.TimeoutError, httpx.RequestError)),
    )
    async def fetch(self, url: str, use_playwright: bool = False) -> CrawlResult:
        state = await self.rate_limiter.acquire(url)
        try:
            if use_playwright:
                result = await self._fetch_with_playwright(url)
            else:
                async with self.session.get(url) as resp:
                    content = await resp.text()
                    headers = dict(resp.headers)
                    status = resp.status
                    content_hash = hashlib.sha256(content.encode()).hexdigest()
                    result = CrawlResult(url, status, content, headers, content_hash, utcnow())
            self.stats["fetched"] += 1
            return result
        except Exception as e:
            self.stats["failed"] += 1
            logger.error(f"Fetch failed for {url}: {e}")
            raise
        finally:
            self.rate_limiter.release(url, state)

    @abstractmethod
    async def discover(self) -> list[str]:
        """Return list of URLs to crawl."""
        pass

    @abstractmethod
    async def parse(self, result: CrawlResult) -> list[dict]:
        """Parse crawl result into structured records."""
        pass


class SourceAdapter(ABC):
    def __init__(self, source_name: str, source_url: str, session=None):
        self.source_name = source_name
        self.source_url = source_url
        self.session = session

    @property
    def source_type(self) -> str:
        return self.record_type()

    @property
    def base_url(self) -> str:
        """Return the base URL for this adapter."""
        return urlparse(self.source_url).netloc

    def is_fresh(self, publication_time: datetime) -> bool:
        """Check if content is fresh based on publication date.
        
        Compares publication time against current time with 24-hour freshness window.
        """
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        if isinstance(publication_time, str):
            publication_time = datetime.fromisoformat(publication_time)
        if publication_time.tzinfo is None:
            publication_time = publication_time.replace(tzinfo=timezone.utc)
        age = (now - publication_time).total_seconds()
        return age < 86400  # 24 hours in seconds

    @abstractmethod
    async def collect(self) -> list[dict]:
        """Collect and return raw records with provenance."""
        pass

    @abstractmethod
    def record_type(self) -> str:
        """Return record type: startup, product, paper, job, news."""
        pass

    def generate_content_hash(self, data: dict) -> str:
        """Generate deterministic SHA256 content hash from data dict."""
        import hashlib
        import json
        canonical = json.dumps(data, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(canonical.encode()).hexdigest()


# Re-export adapters for pipeline and worker use
from app.crawlers.startups import STARTUP_ADAPTERS  # noqa: E402,F401
from app.crawlers.products import PRODUCT_ADAPTERS  # noqa: E402,F401
from app.crawlers.papers import PAPER_ADAPTERS  # noqa: E402,F401
from app.crawlers.news import NEWS_ADAPTERS  # noqa: E402,F401
from app.crawlers.jobs import JOB_ADAPTERS  # noqa: E402,F401
from app.crawlers.api_sources import API_SOURCE_ADAPTERS  # noqa: E402,F401