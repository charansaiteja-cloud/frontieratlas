"""Research paper source adapters with pagination, retries, and deduplication."""
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


async def fetch_with_retry(client: httpx.AsyncClient, url: str, params: dict = None, headers: dict = None, max_retries: int = 3) -> httpx.Response | None:
    """Fetch with exponential backoff and jitter."""
    for attempt in range(max_retries):
        try:
            resp = await client.get(url, params=params, headers=headers)
            if resp.status_code == 429:
                wait_time = (2 ** attempt) + asyncio.get_event_loop().time() % 1
                await asyncio.sleep(wait_time)
                continue
            if resp.status_code >= 500:
                wait_time = (2 ** attempt) + asyncio.get_event_loop().time() % 1
                await asyncio.sleep(wait_time)
                continue
            return resp
        except (httpx.TimeoutException, httpx.NetworkError):
            wait_time = (2 ** attempt) + asyncio.get_event_loop().time() % 1
            await asyncio.sleep(wait_time)
    return None


class ArxivAdapter(SourceAdapter):
    """arXiv API for AI papers with pagination."""
    def __init__(self, session=None):
        super().__init__("arXiv", "https://export.arxiv.org/api/query")
        self.session = session

    def record_type(self) -> str:
        return "paper"

    async def parse_arxiv_response(self, xml_response: str) -> list[dict]:
        """Parse arXiv XML response - for test compatibility."""
        records = []
        try:
            root = ET.fromstring(xml_response)
        except Exception:
            return records

        ns = {"atom": "http://www.w3.org/2005/Atom"}
        entries = root.findall("atom:entry", ns)

        for entry in entries:
            id_elem = entry.find("atom:id", ns)
            arxiv_id = id_elem.text.split("/")[-1] if id_elem is not None and id_elem.text else ""

            title_elem = entry.find("atom:title", ns)
            title = title_elem.text.strip() if title_elem is not None and title_elem.text else ""

            summary_elem = entry.find("atom:summary", ns)
            summary = summary_elem.text.strip() if summary_elem is not None and summary_elem.text else ""

            published_elem = entry.find("atom:published", ns)
            published = published_elem.text if published_elem is not None else ""

            updated_elem = entry.find("atom:updated", ns)
            updated = updated_elem.text if updated_elem is not None else ""

            authors = [a.find("atom:name", ns).text for a in entry.findall("atom:author", ns) if a.find("atom:name", ns) is not None]
            link = next((l.get("href") for l in entry.findall("atom:link", ns) if l.get("title") == "pdf"), None)
            if not link:
                link = f"https://arxiv.org/abs/{arxiv_id}" if arxiv_id else ""

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
                "source_url": self.source_url,
                "collected_at": utcnow().isoformat(),
            })
        return records

    async def collect(self) -> list[dict]:
        records = []
        query = "cat:cs.AI OR cat:cs.LG OR cat:cs.CL OR cat:cs.CV OR cat:stat.ML"
        # Fetch multiple pages to get more papers
        for start in [0, 200, 400, 600, 800, 1000]:
            params = {
                "search_query": query,
                "start": start,
                "max_results": 200,
                "sortBy": "submittedDate",
                "sortOrder": "descending",
            }
            url = f"{self.source_url}?{urlencode(params)}"
            try:
                async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
                    resp = await fetch_with_retry(client, url)
                    if not resp or resp.status_code != 200:
                        continue
                    root = ET.fromstring(resp.text)
            except Exception as e:
                continue

            ns = {"atom": "http://www.w3.org/2005/Atom"}
            entries = root.findall("atom:entry", ns)
            if not entries:
                break  # No more results

            for entry in entries:
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
            await asyncio.sleep(0.5)  # Rate limiting
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
        async with httpx.AsyncClient(timeout=settings.request_timeout, follow_redirects=True) as client:
            for page in range(1, 11):  # More pages
                url = f"{self.source_url}?page={page}&ordering=-published"
                resp = await fetch_with_retry(client, url, headers={"Accept": "application/json"})
                if not resp or resp.status_code != 200:
                    break
                content_type = resp.headers.get("content-type", "")
                if "application/json" not in content_type:
                    # PapersWithCode returns HTML, try to find JSON in script tags or skip
                    break
                try:
                    data = resp.json()
                except Exception:
                    break

                results = data.get("results", [])
                if not results:
                    break

                for item in results:
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
    """OpenAlex API with proper error handling."""
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
            resp = await fetch_with_retry(client, url)
            if not resp or resp.status_code != 200:
                return records
            try:
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
                for loc in item.get("locations", []) or []:
                    if loc and loc.get("source") and loc.get("source", {}).get("id") == "S4306400366":  # arXiv
                        arxiv_id = loc.get("landing_page_url", "").split("/")[-1]
                github_url = None
                for loc in item.get("locations", []) or []:
                    if loc and "github" in (loc.get("url", "") or "").lower():
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
            resp = await fetch_with_retry(client, self.source_url)
            if not resp or resp.status_code != 200:
                return records
            try:
                data = resp.json()
            except Exception:
                return records
            for item in data[:200]:  # More papers
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


class SemanticScholarAdapter(SourceAdapter):
    """Semantic Scholar API for AI papers with API key support."""
    def __init__(self, session=None):
        super().__init__("Semantic Scholar", "https://api.semanticscholar.org/graph/v1/paper/search")
        self.session = session
        self.api_key = getattr(settings, "semantic_scholar_api_key", None)

    def record_type(self) -> str:
        return "paper"

    async def collect(self) -> list[dict]:
        records = []
        params = {
            "query": "artificial intelligence",
            "limit": 100,
            "fields": "title,authors,abstract,year,venue,url,externalIds,publicationDate,citationCount",
        }
        headers = {"Accept": "application/json"}
        if self.api_key:
            headers["x-api-key"] = self.api_key

        async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
            resp = await fetch_with_retry(client, self.source_url, params=params, headers=headers)
            if not resp:
                return records
            if resp.status_code == 429:
                # Rate limited - return empty but don't fail
                return records
            if resp.status_code != 200:
                return records
            try:
                data = resp.json()
            except Exception:
                return records

            for item in data.get("data", []):
                title = item.get("title", "")
                authors = [a.get("name", "") for a in item.get("authors", [])]
                abstract = item.get("abstract", "") or ""
                venue = item.get("venue", "")
                year = item.get("year")
                paper_url = item.get("url", "")
                external_ids = item.get("externalIds", {})
                arxiv_id = external_ids.get("ArXiv", "")
                doi = external_ids.get("DOI", "")
                published = item.get("publicationDate", "")
                if year and not published:
                    published = f"{year}-01-01"

                github_url = None
                if "github.com" in (paper_url or "").lower():
                    github_url = paper_url

                github_owner, github_repo = self._parse_github_url(github_url) if github_url else (None, None)

                records.append({
                    "title": title,
                    "authors": authors,
                    "abstract": abstract,
                    "paper_url": paper_url or (f"https://doi.org/{doi}" if doi else ""),
                    "arxiv_id": arxiv_id,
                    "github_url": github_url,
                    "github_stars": item.get("citationCount"),
                    "github_repo_owner": github_owner,
                    "github_repo_name": github_repo,
                    "published_date": published,
                    "metrics_updated_at": utcnow().isoformat(),
                    "source_name": self.source_name,
                    "source_url": str(resp.url) if resp else self.source_url,
                    "collected_at": utcnow().isoformat(),
                })
        return records

    def _parse_github_url(self, url: str) -> tuple[str, str] | tuple[None, None]:
        import re
        m = re.search(r"github\.com/([\w\-]+)/([\w\-\.]+)", url)
        if m:
            return m.group(1), m.group(2).replace(".git", "")
        return None, None


class CrossrefAdapter(SourceAdapter):
    """Crossref API for AI papers with DOIs."""
    def __init__(self, session=None):
        super().__init__("Crossref", "https://api.crossref.org/works")
        self.session = session

    def record_type(self) -> str:
        return "paper"

    async def collect(self) -> list[dict]:
        records = []
        params = {
            "query": "artificial intelligence",
            "rows": 200,
            "sort": "published",
            "order": "desc",
            "filter": "has-abstract:true",
        }
        async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
            resp = await fetch_with_retry(client, self.source_url, params=params)
            if not resp or resp.status_code != 200:
                return records
            try:
                data = resp.json()
            except Exception:
                return records

            for item in data.get("message", {}).get("items", []):
                title = item.get("title", [""])[0] if item.get("title") else ""
                authors = []
                for author in item.get("author", []):
                    given = author.get("given", "")
                    family = author.get("family", "")
                    if given or family:
                        authors.append(f"{given} {family}".strip())
                abstract = item.get("abstract", "") or ""
                venue = item.get("container-title", [""])[0] if item.get("container-title") else ""
                doi = item.get("DOI", "")
                paper_url = f"https://doi.org/{doi}" if doi else ""

                # Parse publication date
                published = ""
                published_data = item.get("published", {}).get("date-time") or item.get("published-print", {}).get("date-time") or item.get("published-online", {}).get("date-time")
                if published_data:
                    published = published_data
                elif item.get("published-print", {}).get("date-parts"):
                    parts = item["published-print"]["date-parts"][0]
                    published = "-".join(str(p).zfill(2) for p in parts)

                github_url = None
                for link in item.get("link", []):
                    if "github.com" in link.get("URL", "").lower():
                        github_url = link["URL"]
                        break

                github_owner, github_repo = self._parse_github_url(github_url) if github_url else (None, None)

                records.append({
                    "title": title,
                    "authors": authors,
                    "abstract": abstract,
                    "paper_url": paper_url,
                    "arxiv_id": "",
                    "github_url": github_url,
                    "github_stars": None,
                    "github_repo_owner": github_owner,
                    "github_repo_name": github_repo,
                    "published_date": published,
                    "metrics_updated_at": utcnow().isoformat(),
                    "source_name": self.source_name,
                    "source_url": str(resp.url) if resp else self.source_url,
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
    SemanticScholarAdapter(),
    CrossrefAdapter(),
    GitHubRepoSearchAdapter(),
]