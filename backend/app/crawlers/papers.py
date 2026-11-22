"""Research paper source adapters."""
import asyncio
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlencode

import httpx

from app.crawlers import SourceAdapter
from app.config import settings


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ArxivAdapter(SourceAdapter):
    """arXiv API for AI papers."""
    def __init__(self, session=None):
        super().__init__("arXiv", "https://export.arxiv.org/api/query")
        self.session = session

    def record_type(self) -> str:
        return "paper"

    async def parse_arxiv_response(self, xml_response: str) -> list[dict]:
        """Parse arXiv API XML response into list of paper dicts."""
        import xml.etree.ElementTree as ET
        
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        root = ET.fromstring(xml_response)
        
        results = []
        for entry in root.findall("atom:entry", ns):
            arxiv_id = entry.find("atom:id", ns).text.split("/")[-1]
            title = entry.find("atom:title", ns).text.strip()
            summary = entry.find("atom:summary", ns).text.strip() if entry.find("atom:summary", ns) is not None else ""
            published = entry.find("atom:published", ns).text if entry.find("atom:published", ns) is not None else ""
            
            results.append({
                "title": title,
                "abstract": summary,
                "published_date": published,
            })
        return results

    async def collect(self) -> list[dict]:
        records = []
        query = "cat:cs.AI OR cat:cs.LG OR cat:cs.CL OR cat:cs.CV OR cat:stat.ML"
        params = {
            "search_query": query,
            "start": 0,
            "max_results": 200,
            "sortBy": "submittedDate",
            "sortOrder": "descending",
        }
        url = f"{self.source_url}?{urlencode(params)}"
        try:
            async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
                resp = await client.get(url)
                root = ET.fromstring(resp.text)
        except Exception as e:
            return records

        ns = {"atom": "http://www.w3.org/2005/Atom"}
        for entry in root.findall("atom:entry", ns):
            arxiv_id = entry.find("atom:id", ns).text.split("/")[-1]
            title = entry.find("atom:title", ns).text.strip()
            summary = entry.find("atom:summary", ns).text.strip() if entry.find("atom:summary", ns) is not None else ""
            published = entry.find("atom:published", ns).text
            updated = entry.find("atom:updated", ns).text
            authors = [a.find("atom:name", ns).text for a in entry.findall("atom:author", ns)]
            link = next((l.get("href") for l in entry.findall("atom:link", ns) if l.get("title") == "pdf"), None)
            if not link:
                link = f"https://arxiv.org/abs/{arxiv_id}"

            github_url = self._extract_github(summary)
            github_owner, github_repo = self._parse_github_url(github_url) if github_url else (None, None)

            records.append({
                "title": title,
                "authors": authors,
                "abstract": summary,
                "paper_url": link,
                "arxiv_id": arxiv_id,
                "github_url": github_url,
                "github_stars": None,
                "github_repo_owner": github_owner,
                "github_repo_name": github_repo,
                "published_date": published,
                "metrics_updated_at": utcnow().isoformat(),
                "source_name": self.source_name,
                "source_url": url,
                "collected_at": utcnow().isoformat(),
            })
        return records

    def _extract_github(self, text: str) -> str | None:
        patterns = [
            r"github\.com/([\w\-]+/[\w\-\.]+)",
            r"github\.com/([\w\-]+/[\w\-\.]+)\.git",
        ]
        for pat in patterns:
            m = re.search(pat, text)
            if m:
                return f"https://github.com/{m.group(1)}"
        return None

    def _parse_github_url(self, url: str) -> tuple[str, str] | tuple[None, None]:
        if not url:
            return None, None
        m = re.search(r"github\.com/([\w\-]+)/([\w\-\.]+)", url)
        if m:
            return m.group(1), m.group(2).replace(".git", "")
        return None, None


class PapersWithCodeAdapter(SourceAdapter):
    """Papers with Code."""
    def __init__(self, session=None):
        super().__init__("PapersWithCode", "https://paperswithcode.com/api/v1/papers/")
        self.session = session

    def record_type(self) -> str:
        return "paper"

    async def collect(self) -> list[dict]:
        records = []
        async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
            for page in range(1, 6):
                url = f"{self.source_url}?page={page}&ordering=-published"
                try:
                    resp = await client.get(url)
                    data = resp.json()
                except Exception:
                    break
                for item in data.get("results", []):
                    title = item.get("title", "")
                    authors = [a.get("name", "") for a in item.get("authors", [])]
                    abstract = item.get("abstract", "")
                    paper_url = item.get("url_pdf", "") or item.get("url_abs", "")
                    arxiv_id = item.get("arxiv_id", "")
                    github_url = item.get("url_repo", "")
                    github_owner, github_repo = self._parse_github_url(github_url) if github_url else (None, None)
                    github_stars = item.get("github_stars")
                    published = item.get("published", "")
                    
                    records.append({
                        "title": title,
                        "authors": authors,
                        "abstract": abstract,
                        "paper_url": paper_url,
                        "arxiv_id": arxiv_id,
                        "github_url": github_url,
                        "github_stars": github_stars,
                        "github_repo_owner": github_owner,
                        "github_repo_name": github_repo,
                        "published_date": published,
                        "metrics_updated_at": utcnow().isoformat(),
                        "source_name": self.source_name,
                        "source_url": url,
                        "collected_at": utcnow().isoformat(),
                    })
                await asyncio.sleep(1)
        return records

    def _parse_github_url(self, url: str) -> tuple[str, str] | tuple[None, None]:
        import re
        m = re.search(r"github\.com/([\w\-]+)/([\w\-\.]+)", url)
        if m:
            return m.group(1), m.group(2).replace(".git", "")
        return None, None


class OpenAlexAdapter(SourceAdapter):
    """OpenAlex API."""
    def __init__(self, session=None):
        super().__init__("OpenAlex", "https://api.openalex.org/works")
        self.session = session

    def record_type(self) -> str:
        return "paper"

    async def collect(self) -> list[dict]:
        records = []
        params = {
            "filter": "concepts.id:C41008148|C154945302|C151730425",  # AI, ML, NLP
            "sort": "publication_date:desc",
            "per_page": 200,
        }
        async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
            url = f"{self.source_url}?{urlencode(params)}"
            try:
                resp = await client.get(url)
                data = resp.json()
            except Exception:
                return records
            for item in data.get("results", []):
                title = item.get("title", "")
                authors = [a.get("author", {}).get("display_name", "") for a in item.get("authorships", [])]
                abstract = item.get("abstract_inverted_index", "")
                if isinstance(abstract, dict):
                    # reconstruct from inverted index
                    words = sorted([(w, p) for w, positions in abstract.items() for p in positions], key=lambda x: x[1])
                    abstract = " ".join(w for w, _ in words)
                paper_url = item.get("doi", "") or item.get("id", "")
                arxiv_id = None
                for loc in item.get("locations", []):
                    if loc.get("source", {}).get("id") == "S4306400366":  # arXiv
                        arxiv_id = loc.get("landing_page_url", "").split("/")[-1]
                github_url = None
                for loc in item.get("locations", []):
                    if "github" in loc.get("url", "").lower():
                        github_url = loc.get("url")
                github_owner, github_repo = self._parse_github_url(github_url) if github_url else (None, None)
                published = item.get("publication_date", "")
                
                records.append({
                    "title": title,
                    "authors": authors,
                    "abstract": abstract,
                    "paper_url": paper_url,
                    "arxiv_id": arxiv_id,
                    "github_url": github_url,
                    "github_stars": None,
                    "github_repo_owner": github_owner,
                    "github_repo_name": github_repo,
                    "published_date": published,
                    "metrics_updated_at": utcnow().isoformat(),
                    "source_name": self.source_name,
                    "source_url": url,
                    "collected_at": utcnow().isoformat(),
                })
        return records

    def _parse_github_url(self, url: str) -> tuple[str, str] | tuple[None, None]:
        import re
        m = re.search(r"github\.com/([\w\-]+)/([\w\-\.]+)", url)
        if m:
            return m.group(1), m.group(2).replace(".git", "")
        return None, None


class HuggingFacePapersAdapter(SourceAdapter):
    """Hugging Face Daily Papers."""
    def __init__(self, session=None):
        super().__init__("HuggingFace Papers", "https://huggingface.co/api/daily_papers")
        self.session = session

    def record_type(self) -> str:
        return "paper"

    async def collect(self) -> list[dict]:
        records = []
        async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
            try:
                resp = await client.get(self.source_url)
                data = resp.json()
            except Exception:
                return records
            for item in data[:100]:
                paper = item.get("paper", {})
                title = paper.get("title", "")
                authors = paper.get("authors", [])
                abstract = paper.get("summary", "")
                arxiv_id = paper.get("arxiv_id", "")
                paper_url = f"https://arxiv.org/abs/{arxiv_id}" if arxiv_id else ""
                github_url = paper.get("github_url", "")
                github_owner, github_repo = self._parse_github_url(github_url) if github_url else (None, None)
                published = paper.get("publishedAt", "")
                
                records.append({
                    "title": title,
                    "authors": authors,
                    "abstract": abstract,
                    "paper_url": paper_url,
                    "arxiv_id": arxiv_id,
                    "github_url": github_url,
                    "github_stars": None,
                    "github_repo_owner": github_owner,
                    "github_repo_name": github_repo,
                    "published_date": published,
                    "metrics_updated_at": utcnow().isoformat(),
                    "source_name": self.source_name,
                    "source_url": self.source_url,
                    "collected_at": utcnow().isoformat(),
                })
        return records

    def _parse_github_url(self, url: str) -> tuple[str, str] | tuple[None, None]:
        import re
        m = re.search(r"github\.com/([\w\-]+)/([\w\-\.]+)", url)
        if m:
            return m.group(1), m.group(2).replace(".git", "")
        return None, None


from app.crawlers.api_sources import GitHubRepoSearchAdapter

PAPER_ADAPTERS = [
    ArxivAdapter(),
    PapersWithCodeAdapter(),
    OpenAlexAdapter(),
    HuggingFacePapersAdapter(),
    GitHubRepoSearchAdapter(),
]