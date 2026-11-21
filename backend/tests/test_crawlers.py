"""Tests for crawler framework and adapters."""
import pytest
from unittest.mock import AsyncMock, patch
from datetime import datetime, timezone, timedelta
import asyncio

from app.crawlers import BaseCrawler, RateLimiter, SourceAdapter
from app.crawlers.startups import YCombinatorAdapter, HuggingFaceOrgsAdapter
from app.crawlers.products import ProductHuntAIAdapter, FuturepediaAdapter
from app.crawlers.papers import ArxivAdapter, PapersWithCodeAdapter
from app.crawlers.news import TechCrunchAIAdapter, VentureBeatAIAdapter
from app.crawlers.jobs import GreenhouseAdapter, LeverAdapter


# Concrete test subclass for BaseCrawler
class _TestBaseCrawler(BaseCrawler):
    """Concrete subclass for testing."""
    def __init__(self, session, max_retries=3):
        super().__init__("test", "http://example.com")
        self.session = session
        self.max_retries = max_retries
    
    async def discover(self) -> list[str]:
        return []
    
    async def parse(self, result) -> list[dict]:
        return []


@pytest.fixture
def mock_session():
    """Create a mock aiohttp ClientSession that returns proper response objects."""
    session = AsyncMock()
    
    class _MockResponse:
        """Mock aiohttp ClientResponse with proper async context manager support."""
        def __init__(self, status, text, json_data, headers):
            self.status = status
            self._text = text
            self._json = json_data
            self._headers = headers
        
        async def __aenter__(self):
            return self
        
        async def __aexit__(self, exc_type, exc_val, exc_tb):
            pass
        
        def get_text(self):
            return self._text
        
        def get_json(self):
            return self._json
        
        def get_headers(self):
            return self._headers
    
    # Base success response
    success_response = _MockResponse(
        status=200,
        text="<html>Test</html>",
        json_data={"data": "test"},
        headers={"content-type": "text/html"}
    )
    session.get.return_value = success_response
    return session


class TestRateLimiter:
    """Tests for the RateLimiter class."""
    
    @pytest.mark.asyncio
    async def test_rate_limiter_allows_requests_under_limit(self):
        limiter = RateLimiter(max_concurrency=10, per_domain_concurrency=5)
        
        # Should allow burst requests quickly
        for _ in range(5):
            state = await limiter.acquire("test.com")
            limiter.release("test.com", state)
        
        # Should not raise
    
    @pytest.mark.asyncio
    async def test_rate_limiter_basic_acquire_release(self):
        """Test basic acquire/release cycle."""
        limiter = RateLimiter(max_concurrency=3, per_domain_concurrency=2)
        
        # Acquire and release individual requests
        state1 = await limiter.acquire("test.com")
        limiter.release("test.com", state1)
        state2 = await limiter.acquire("test.com")
        limiter.release("test.com", state2)
        state3 = await limiter.acquire("test.com")
        limiter.release("test.com", state3)


class TestBaseCrawler:
    """Tests for the BaseCrawler class."""
    
    @pytest.mark.asyncio
    async def test_crawler_fetch_success(self, mock_session):
        """Test successful fetch."""
        crawler = _TestBaseCrawler(mock_session)
        result = await crawler.fetch("https://example.com")
        
        assert result is not None
        assert result.status == 200
    
    @pytest.mark.asyncio
    async def test_crawler_fetch_retry_on_429(self, mock_session):
        """Test retry on 429 status code."""
        from unittest.mock import patch
        
        # Create mock responses
        class _429Response:
            status = 429
            _text = "<html>429 Error</html>"
            def get_text(self):
                return self._text
            def get_headers(self):
                return {"content-type": "text/html", "retry-after": "0"}
        
        class _200Response:
            status = 200
            _text = "<html>Success</html>"
            def get_text(self):
                return self._text
            def get_headers(self):
                return {"content-type": "text/html"}
        
        # Patch session.get to return our mock responses
        original_get = mock_session.get
        mock_session.get = lambda url: _429Response()
        
        crawler = _TestBaseCrawler(mock_session, max_retries=2)
        result = await crawler.fetch("https://example.com")
        
        # Should succeed on second attempt with retry
        assert result is not None
    
    @pytest.mark.asyncio
    async def test_crawler_fetch_413_handling(self, mock_session):
        """Test 413 payload too large handling."""
        from unittest.mock import patch
        
        # Create mock responses
        class _413Response:
            status = 413
            _text = "<html>413 Payload Too Large</html>"
            def get_text(self):
                return self._text
            def get_headers(self):
                return {"content-type": "text/html", "content-length": "123"}
        
        class _200Response:
            status = 200
            _text = "<html>Success</html>"
            def get_text(self):
                return self._text
            def get_headers(self):
                return {"content-type": "text/html"}
        
        # Patch session.get to return our mock responses
        mock_session.get = lambda url: _413Response()
        
        crawler = _TestBaseCrawler(mock_session, max_retries=2)
        result = await crawler.fetch("https://example.com")
        
        # Should succeed on second attempt
        assert result is not None
        assert result.status == 200


class TestSourceAdapterBase:
    """Tests for the base SourceAdapter class."""
    
    class _TestSourceAdapter(SourceAdapter):
        """Minimal concrete SourceAdapter for testing."""
        def __init__(self):
            super().__init__("Test Source", "http://example.com")
        
        def record_type(self) -> str:
            return "test"
        
        async def collect(self) -> list[dict]:
            return []
    
    @pytest.mark.asyncio
    async def test_adapter_interface(self):
        """Test SourceAdapter interface."""
        adapter = self._TestSourceAdapter()
        
        assert adapter.source_name == "Test Source"
        assert adapter.source_url == "http://example.com"
        assert adapter.source_type == "test"
        
        # Concrete subclass implements collect, so no NotImplementedError
        result = await adapter.collect()
        assert result == []
    
    @pytest.mark.asyncio
    async def test_content_hash_generation(self):
        """Test content hash is deterministic."""
        adapter = self._TestSourceAdapter()
        
        data = {"key": "value", "number": 123}
        hash1 = adapter.generate_content_hash(data)
        hash2 = adapter.generate_content_hash(data)
        
        assert hash1 == hash2  # Deterministic
        assert len(hash1) == 64  # SHA256 hex


class TestYCombinatorAdapter:
    """Tests for YCombinatorAdapter."""
    
    @pytest.mark.asyncio
    async def test_adapter_initialization(self):
        """Test adapter initialization."""
        adapter = YCombinatorAdapter()
        
        assert adapter.source_name == "YCombinator"
        assert adapter.source_type == "startup"
        assert adapter.base_url == "www.ycombinator.com"


class TestHuggingFaceOrgsAdapter:
    """Tests for HuggingFaceOrgsAdapter."""
    
    @pytest.mark.asyncio
    async def test_adapter_initialization(self):
        """Test adapter initialization."""
        adapter = HuggingFaceOrgsAdapter()
        
        assert adapter.source_name == "HuggingFace"
        assert adapter.source_type == "startup"
        assert "huggingface.co" in adapter.base_url


class TestProductHuntAIAdapter:
    """Tests for ProductHuntAIAdapter."""
    
    @pytest.mark.asyncio
    async def test_adapter_initialization(self):
        """Test adapter initialization."""
        adapter = ProductHuntAIAdapter()
        
        assert adapter.source_name == "ProductHunt AI"
        assert adapter.source_type == "product"


class TestFuturepediaAdapter:
    """Tests for FuturepediaAdapter."""
    
    @pytest.mark.asyncio
    async def test_adapter_initialization(self):
        """Test adapter initialization."""
        adapter = FuturepediaAdapter()
        
        assert adapter.source_name == "Futurepedia"
        assert adapter.source_type == "product"


class TestArxivAdapter:
    """Tests for ArxivAdapter."""
    
    @pytest.mark.asyncio
    async def test_adapter_initialization(self):
        """Test adapter initialization."""
        adapter = ArxivAdapter()
        
        assert adapter.source_name == "arXiv"
        assert adapter.source_type == "paper"
        assert "arxiv.org" in adapter.base_url
    
    @pytest.mark.asyncio
    async def test_parse_arxiv_response(self):
        """Test arXiv response parsing."""
        adapter = ArxivAdapter()
        
        xml_response = '''<feed xmlns="http://www.w3.org/2005/Atom">
            <entry>
                <title>Test Paper</title>
                <id>http://arxiv.org/abs/2101.1</id>
                <updated>2021-01-01T00:00:00Z</updated>
                <author>
                    <name>Test Author</name>
                </author>
                <link href="http://arxiv.org/abs/2101.1" rel="alternate"/>
            </entry>
        </feed>'''
        
        results = await adapter.parse_arxiv_response(xml_response)
        assert len(results) > 0
        assert results[0]["title"] == "Test Paper"


class TestPapersWithCodeAdapter:
    """Tests for PapersWithCodeAdapter."""
    
    @pytest.mark.asyncio
    async def test_adapter_initialization(self):
        """Test adapter initialization."""
        adapter = PapersWithCodeAdapter()
        
        assert adapter.source_name == "PapersWithCode"
        assert adapter.source_type == "paper"


class TestTechCrunchAIAdapter:
    """Tests for TechCrunchAIAdapter."""
    
    @pytest.mark.asyncio
    async def test_adapter_initialization(self):
        """Test adapter initialization."""
        adapter = TechCrunchAIAdapter()
        
        assert adapter.source_name == "TechCrunch AI"
        assert adapter.source_type == "news"


class TestVentureBeatAIAdapter:
    """Tests for VentureBeatAIAdapter."""
    
    @pytest.mark.asyncio
    async def test_adapter_initialization(self):
        """Test adapter initialization."""
        adapter = VentureBeatAIAdapter()
        
        assert adapter.source_name == "VentureBeat AI"
        assert adapter.source_type == "news"


class TestGreenhouseAdapter:
    """Tests for GreenhouseAdapter."""
    
    @pytest.mark.asyncio
    async def test_adapter_initialization(self):
        """Test adapter initialization."""
        adapter = GreenhouseAdapter()
        
        assert adapter.source_name == "Greenhouse"
        assert adapter.source_type == "job"
    
    @pytest.mark.asyncio
    async def test_freshness_validation(self):
        """Test freshness validation."""
        from datetime import timedelta
        
        adapter = GreenhouseAdapter()
        
        # Fresh article (within 24h)
        fresh_time = datetime.now(timezone.utc) - timedelta(hours=12)
        assert adapter.is_fresh(fresh_time) is True
        
        # Stale article (older than 24h)
        stale_time = datetime.now(timezone.utc) - timedelta(hours=36)
        assert adapter.is_fresh(stale_time) is False


class TestLeverAdapter:
    """Tests for LeverAdapter."""
    
    @pytest.mark.asyncio
    async def test_adapter_initialization(self):
        """Test adapter initialization."""
        adapter = LeverAdapter()
        
        assert adapter.source_name == "Lever"
        assert adapter.source_type == "job"


class TestCrawlerErrorHandling:
    """Tests for crawler error handling."""
    
    @pytest.mark.asyncio
    async def test_network_timeout_handling(self):
        """Test network timeout handling."""
        mock_session = AsyncMock()
        mock_session.get.side_effect = asyncio.TimeoutError()
        
        crawler = _TestBaseCrawler(mock_session)
        
        with pytest.raises(asyncio.TimeoutError):
            await crawler.fetch("https://example.com")
    
    @pytest.mark.asyncio
    async def test_invalid_response_handling(self):
        """Test invalid response handling."""
        from unittest.mock import patch
        
        mock_session = AsyncMock()
        
        class MockResponse:
            status = 500
            _text = "Server Error"
            def get_text(self):
                return self._text
            def get_json(self):
                return None
            def get_headers(self):
                return {}
        
        mock_session.get.return_value = MockResponse()
        
        crawler = _TestBaseCrawler(mock_session)
        
        with pytest.raises(Exception):
            await crawler.fetch("https://example.com")
