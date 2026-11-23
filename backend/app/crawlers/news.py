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


async def fetch_with_retry(client: httpx.AsyncClient, url: str, headers: dict = None, max_retries: int = 3) -> httpx.Response | None:
    """Fetch with exponential backoff and jitter."""
    for attempt in range(max_retries):
        try:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 429:
                wait_time = (2 ** attempt) + 0.5
                await asyncio.sleep(wait_time)
                continue
            if resp.status_code >= 500:
                wait_time = (2 ** attempt) + 0.5
                await asyncio.sleep(wait_time)
                continue
            return resp
        except (httpx.TimeoutException, httpx.NetworkError):
            wait_time = (2 ** attempt) + 0.5
            await asyncio.sleep(wait_time)
    return None


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
                resp = await fetch_with_retry(client, self.feed_url)
                if not resp or resp.status_code != 200:
                    return records
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


class ArtificialIntelligenceNewsAdapter(BaseNewsAdapter):
    """Artificial Intelligence News - AI-focused news site."""
    def __init__(self, session=None):
        super().__init__("Artificial Intelligence News", "https://artificialintelligence-news.com/feed/", "https://artificialintelligence-news.com/", session)


class VentureBeatAIAdapterFixed(BaseNewsAdapter):
    """VentureBeat AI with better error handling."""
    def __init__(self, session=None):
        super().__init__("VentureBeat AI", "https://venturebeat.com/category/ai/feed/", "https://venturebeat.com/category/ai/", session)


class InfoWorldAIAdapter(BaseNewsAdapter):
    """InfoWorld AI/ML coverage."""
    def __init__(self, session=None):
        super().__init__("InfoWorld AI", "https://www.infoworld.com/category/artificial-intelligence/index.rss", "https://www.infoworld.com/category/artificial-intelligence/", session)


class ZDNetAIAdapter(BaseNewsAdapter):
    """ZDNet AI coverage."""
    def __init__(self, session=None):
        super().__init__("ZDNet AI", "https://www.zdnet.com/topic/artificial-intelligence/rss.xml", "https://www.zdnet.com/topic/artificial-intelligence/", session)


class AnalyticsIndiaMagAdapter(BaseNewsAdapter):
    """Analytics India Magazine - AI news."""
    def __init__(self, session=None):
        super().__init__("Analytics India Magazine", "https://analyticsindiamag.com/feed/", "https://analyticsindiamag.com/", session)


class TheRegisterAIAdapter(BaseNewsAdapter):
    """The Register AI/ML coverage."""
    def __init__(self, session=None):
        super().__init__("The Register AI", "https://www.theregister.com/Software/Artificial_Intelligence/headlines.atom", "https://www.theregister.com/Software/Artificial_Intelligence/", session)


class TowardsDataScienceAdapter(BaseNewsAdapter):
    """Towards Data Science - ML/AI articles on Medium."""
    def __init__(self, session=None):
        super().__init__("Towards Data Science", "https://towardsdatascience.com/feed", "https://towardsdatascience.com/", session)


class MarkTechPostAdapter(BaseNewsAdapter):
    """MarkTechPost - AI/ML news and tutorials."""
    def __init__(self, session=None):
        super().__init__("MarkTechPost", "https://www.marktechpost.com/feed/", "https://www.marktechpost.com/", session)


class AnalyticsVidhyaAdapter(BaseNewsAdapter):
    """Analytics Vidhya - AI/ML tutorials and news."""
    def __init__(self, session=None):
        super().__init__("Analytics Vidhya", "https://www.analyticsvidhya.com/feed/", "https://www.analyticsvidhya.com/", session)


class AWSMLBlogAdapter(BaseNewsAdapter):
    """AWS Machine Learning Blog."""
    def __init__(self, session=None):
        super().__init__("AWS ML Blog", "https://aws.amazon.com/blogs/machine-learning/feed/", "https://aws.amazon.com/blogs/machine-learning/", session)


class TowardsAIAdapter(BaseNewsAdapter):
    """Towards AI - AI/ML publication on Medium."""
    def __init__(self, session=None):
        super().__init__("Towards AI", "https://pub.towardsai.net/feed", "https://pub.towardsai.net/", session)


class MachineLearningMasteryAdapter(BaseNewsAdapter):
    """Machine Learning Mastery - ML tutorials and news."""
    def __init__(self, session=None):
        super().__init__("Machine Learning Mastery", "https://machinelearningmastery.com/blog/feed/", "https://machinelearningmastery.com/", session)


NEWS_ADAPTERS = [
    TheDecoderAdapter(),
    TowardsDataScienceAdapter(),
    MarkTechPostAdapter(),
    AnalyticsVidhyaAdapter(),
    AWSMLBlogAdapter(),
    TowardsAIAdapter(),
    MachineLearningMasteryAdapter(),
    AnalyticsIndiaMagAdapter(),
    TechCrunchAIAdapter(),
    MITTechReviewAIAdapter(),
    HuggingFaceBlogAdapter(),
]