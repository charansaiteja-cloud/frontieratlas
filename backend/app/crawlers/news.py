"""News source adapters with 24-hour freshness filter."""
import asyncio
import feedparser
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Any
from urllib.parse import urljoin

import httpx

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


class BaseNewsAdapter(SourceAdapter):
    def __init__(self, name: str, feed_url: str, source_url: str, session=None):
        super().__init__(name, source_url, session)
        self.feed_url = feed_url

    def record_type(self) -> str:
        return "news"

    async def collect(self) -> list[dict]:
        records = []
        try:
            async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
                resp = await client.get(self.feed_url)
                feed = feedparser.parse(resp.text)
        except Exception:
            return records
        
        for entry in feed.entries[:50]:
            published = self._parse_date(entry)
            if not is_fresh(published):
                continue
            
            full_text = entry.get("content", [{}])[0].get("value", "") if entry.get("content") else entry.get("summary", "")
            content_hash = hashlib.sha256(f"{entry.get('title','')}{full_text}".encode()).hexdigest()
            
            records.append({
                "headline": entry.get("title", ""),
                "author": entry.get("author", ""),
                "published_at": published.isoformat() if published else utcnow().isoformat(),
                "full_text": full_text,
                "article_url": entry.get("link", ""),
                "source_name": self.source_name,
                "source_url": self.feed_url,
                "collected_at": utcnow().isoformat(),
                "content_hash": content_hash,
            })
        return records

    def _parse_date(self, entry) -> datetime | None:
        for key in ["published_parsed", "updated_parsed"]:
            if entry.get(key):
                try:
                    return datetime(*entry[key][:6], tzinfo=timezone.utc)
                except Exception:
                    pass
        for key in ["published", "updated"]:
            if entry.get(key):
                try:
                    return datetime.fromisoformat(entry[key].replace("Z", "+00:00"))
                except Exception:
                    pass
        return None


class TechCrunchAIAdapter(BaseNewsAdapter):
    def __init__(self, session=None):
        super().__init__("TechCrunch AI", "https://techcrunch.com/tag/artificial-intelligence/feed/", "https://techcrunch.com/tag/artificial-intelligence/", session)


class VentureBeatAIAdapter(BaseNewsAdapter):
    def __init__(self, session=None):
        super().__init__("VentureBeat AI", "https://venturebeat.com/category/ai/feed/", "https://venturebeat.com/category/ai/", session)


class MITTechReviewAIAdapter(BaseNewsAdapter):
    def __init__(self):
        super().__init__("MIT Technology Review AI", "https://www.technologyreview.com/topic/artificial-intelligence/feed/", "https://www.technologyreview.com/topic/artificial-intelligence/")


class TheDecoderAdapter(BaseNewsAdapter):
    def __init__(self):
        super().__init__("The Decoder", "https://the-decoder.com/feed/", "https://the-decoder.com/")


class HuggingFaceBlogAdapter(BaseNewsAdapter):
    def __init__(self):
        super().__init__("Hugging Face Blog", "https://huggingface.co/blog/feed.xml", "https://huggingface.co/blog/")


NEWS_ADAPTERS = [
    TechCrunchAIAdapter(),
    VentureBeatAIAdapter(),
    MITTechReviewAIAdapter(),
    TheDecoderAdapter(),
    HuggingFaceBlogAdapter(),
]