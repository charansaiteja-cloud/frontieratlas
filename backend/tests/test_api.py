"""Tests for API endpoints."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient

from app.main import app
from app.models import Record, Startup, Product, ResearchPaper, Job, News


class TestHealthEndpoint:
    """Tests for health check endpoint."""

    @pytest.mark.asyncio
    async def test_health_check(self, async_client: AsyncClient):
        response = await async_client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data


class TestDashboardStats:
    """Tests for dashboard stats endpoint."""

    @pytest.mark.asyncio
    async def test_dashboard_stats_empty(self, async_client: AsyncClient, test_session):
        response = await async_client.get("/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        
        assert data["total_startups"] == 0
        assert data["total_products"] == 0
        assert data["total_papers"] == 0
        assert data["total_jobs"] == 0
        assert data["total_news"] == 0

    @pytest.mark.asyncio
    async def test_dashboard_stats_with_data(self, async_client: AsyncClient, test_session):
        # Create test data
        record = Record(
            source_name="test",
            source_url="https://example.com",
            record_type="startup",
            content_hash="abc123",
            raw_data={},
            extraction_status="COMPLETED",
        )
        test_session.add(record)
        await test_session.commit()
        await test_session.refresh(record)

        startup = Startup(record_id=record.id, entity_name="TestAI")
        test_session.add(startup)
        await test_session.commit()

        response = await async_client.get("/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        
        assert data["total_startups"] == 1
        assert data["successful_extractions"] == 1


class TestStartupsEndpoint:
    """Tests for startups CRUD endpoints."""

    @pytest.mark.asyncio
    async def test_get_startups_empty(self, async_client: AsyncClient):
        response = await async_client.get("/startups")
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0

    @pytest.mark.asyncio
    async def test_get_startups_with_data(self, async_client: AsyncClient, test_session):
        record = Record(
            source_name="test",
            source_url="https://example.com/startup",
            record_type="startup",
            content_hash="startup1",
            raw_data={},
        )
        test_session.add(record)
        await test_session.commit()
        await test_session.refresh(record)

        startup = Startup(record_id=record.id, entity_name="TestAI", industry="AI")
        test_session.add(startup)
        await test_session.commit()

        response = await async_client.get("/startups")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1
        assert data["items"][0]["entity_name"] == "TestAI"

    @pytest.mark.asyncio
    async def test_get_startups_search(self, async_client: AsyncClient, test_session):
        # Create multiple startups
        for i, name in enumerate(["TestAI", "OpenAI", "GoogleAI"]):
            record = Record(
                source_name="test",
                source_url=f"https://example.com/{i}",
                record_type="startup",
                content_hash=f"startup{i}",
                raw_data={},
            )
            test_session.add(record)
            await test_session.commit()
            await test_session.refresh(record)

            startup = Startup(record_id=record.id, entity_name=name)
            test_session.add(startup)
        await test_session.commit()

        # Search for "Open"
        response = await async_client.get("/startups?search=Open")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["entity_name"] == "OpenAI"

    @pytest.mark.asyncio
    async def test_get_startups_pagination(self, async_client: AsyncClient, test_session):
        # Create 25 startups
        for i in range(25):
            record = Record(
                source_name="test",
                source_url=f"https://example.com/{i}",
                record_type="startup",
                content_hash=f"startup{i}",
                raw_data={},
            )
            test_session.add(record)
            await test_session.commit()
            await test_session.refresh(record)

            startup = Startup(record_id=record.id, entity_name=f"Startup{i}")
            test_session.add(startup)
        await test_session.commit()

        # Page 1
        response = await async_client.get("/startups?page=1&page_size=10")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 25
        assert len(data["items"]) == 10
        assert data["page"] == 1

        # Page 2
        response = await async_client.get("/startups?page=2&page_size=10")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 10
        assert data["page"] == 2


class TestProductsEndpoint:
    """Tests for products endpoints."""

    @pytest.mark.asyncio
    async def test_get_products(self, async_client: AsyncClient, test_session):
        record = Record(
            source_name="test",
            source_url="https://example.com/product",
            record_type="product",
            content_hash="product1",
            raw_data={},
        )
        test_session.add(record)
        await test_session.commit()
        await test_session.refresh(record)

        product = Product(record_id=record.id, product_name="TestProduct", pricing_model="freemium")
        test_session.add(product)
        await test_session.commit()

        response = await async_client.get("/products")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["product_name"] == "TestProduct"


class TestPapersEndpoint:
    """Tests for papers endpoints."""

    @pytest.mark.asyncio
    async def test_get_papers(self, async_client: AsyncClient, test_session):
        record = Record(
            source_name="test",
            source_url="https://example.com/paper",
            record_type="paper",
            content_hash="paper1",
            raw_data={},
        )
        test_session.add(record)
        await test_session.commit()
        await test_session.refresh(record)

        paper = ResearchPaper(record_id=record.id, title="Test Paper", github_url="https://github.com/test")
        test_session.add(paper)
        await test_session.commit()

        response = await async_client.get("/papers")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["title"] == "Test Paper"

    @pytest.mark.asyncio
    async def test_get_papers_has_github_filter(self, async_client: AsyncClient, test_session):
        # Paper with GitHub
        record1 = Record(source_name="test", source_url="https://example.com/1", record_type="paper", content_hash="p1", raw_data={})
        test_session.add(record1)
        await test_session.commit()
        paper1 = ResearchPaper(record_id=record1.id, title="With GitHub", github_url="https://github.com/test")
        test_session.add(paper1)

        # Paper without GitHub
        record2 = Record(source_name="test", source_url="https://example.com/2", record_type="paper", content_hash="p2", raw_data={})
        test_session.add(record2)
        await test_session.commit()
        paper2 = ResearchPaper(record_id=record2.id, title="Without GitHub")
        test_session.add(paper2)
        await test_session.commit()

        response = await async_client.get("/papers?has_github=true")
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["github_url"] is not None

        response = await async_client.get("/papers?has_github=false")
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["github_url"] is None


class TestJobsEndpoint:
    """Tests for jobs endpoints."""

    @pytest.mark.asyncio
    async def test_get_jobs(self, async_client: AsyncClient, test_session):
        record = Record(
            source_name="test",
            source_url="https://example.com/job",
            record_type="job",
            content_hash="job1",
            raw_data={},
        )
        test_session.add(record)
        await test_session.commit()
        await test_session.refresh(record)

        job = Job(record_id=record.id, title="AI Engineer", company_name="TestAI", is_remote=True)
        test_session.add(job)
        await test_session.commit()

        response = await async_client.get("/jobs")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["title"] == "AI Engineer"

    @pytest.mark.asyncio
    async def test_get_jobs_fresh_only(self, async_client: AsyncClient, test_session):
        # Fresh job (within 24h)
        record1 = Record(source_name="test", source_url="https://example.com/1", record_type="job", content_hash="j1", raw_data={})
        test_session.add(record1)
        await test_session.commit()
        job1 = Job(record_id=record1.id, title="Fresh Job", published_date=datetime.now(timezone.utc))
        test_session.add(job1)

        # Old job
        record2 = Record(source_name="test", source_url="https://example.com/2", record_type="job", content_hash="j2", raw_data={})
        test_session.add(record2)
        await test_session.commit()
        old_date = datetime.now(timezone.utc) - timedelta(days=7)
        job2 = Job(record_id=record2.id, title="Old Job", published_date=old_date)
        test_session.add(job2)
        await test_session.commit()

        response = await async_client.get("/jobs?fresh_only=true")
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["title"] == "Fresh Job"


class TestNewsEndpoint:
    """Tests for news endpoints."""

    @pytest.mark.asyncio
    async def test_get_news(self, async_client: AsyncClient, test_session):
        record = Record(
            source_name="test",
            source_url="https://example.com/news",
            record_type="news",
            content_hash="news1",
            raw_data={},
        )
        test_session.add(record)
        await test_session.commit()
        await test_session.refresh(record)

        news = News(record_id=record.id, headline="Test News", sentiment_score=0.5)
        test_session.add(news)
        await test_session.commit()

        response = await async_client.get("/news")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["headline"] == "Test News"


class TestEntityMappingsEndpoint:
    """Tests for entity mappings endpoint."""

    @pytest.mark.asyncio
    async def test_get_mappings(self, async_client: AsyncClient, test_session):
        from app.models import EntityMappingLog
        
        log = EntityMappingLog(
            raw_entity_name="Test AI",
            canonical_entity_name="TestAI",
            match_method="FUZZY_HIGH",
            confidence_score=0.92,
            resolution_status="AUTO",
            required_human_review=False,
        )
        test_session.add(log)
        await test_session.commit()

        response = await async_client.get("/entities/mappings")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["raw_entity_name"] == "Test AI"


class TestPipelineEndpoints:
    """Tests for pipeline control endpoints."""

    @pytest.mark.asyncio
    async def test_pipeline_status(self, async_client: AsyncClient):
        response = await async_client.get("/pipeline/status")
        assert response.status_code == 200
        data = response.json()
        assert "tasks" in data

    @pytest.mark.asyncio
    async def test_pipeline_logs(self, async_client: AsyncClient):
        response = await async_client.get("/pipeline/logs")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data

    @pytest.mark.asyncio
    async def test_start_pipeline(self, async_client: AsyncClient):
        response = await async_client.post("/pipeline/start")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data

    @pytest.mark.asyncio
    async def test_start_pipeline_type(self, async_client: AsyncClient):
        response = await async_client.post("/pipeline/start?record_type=startup")
        assert response.status_code == 200
        data = response.json()
        assert "startup" in data["message"].lower()

    @pytest.mark.asyncio
    async def test_stop_pipeline(self, async_client: AsyncClient):
        response = await async_client.post("/pipeline/stop")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data

    @pytest.mark.asyncio
    async def test_retry_failed(self, async_client: AsyncClient):
        response = await async_client.post("/pipeline/retry-failed")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data


class TestSourcesEndpoint:
    """Tests for sources endpoint."""

    @pytest.mark.asyncio
    async def test_get_sources(self, async_client: AsyncClient, test_session):
        from app.models import SourceHealth
        
        source = SourceHealth(
            source_name="Test Source",
            source_type="startup",
            health_status="HEALTHY",
            records_discovered=10,
        )
        test_session.add(source)
        await test_session.commit()

        response = await async_client.get("/sources")
        assert response.status_code == 200
        data = response.json()
        assert "sources" in data
        assert len(data["sources"]) == 1
        assert data["sources"][0]["source_name"] == "Test Source"


class TestExportEndpoints:
    """Tests for CSV export endpoints."""

    @pytest.mark.asyncio
    async def test_export_startups(self, async_client: AsyncClient, test_session):
        record = Record(
            source_name="test", source_url="https://example.com", record_type="startup",
            content_hash="s1", raw_data={}, extraction_status="COMPLETED"
        )
        test_session.add(record)
        await test_session.commit()
        startup = Startup(record_id=record.id, entity_name="TestAI", industry="AI")
        test_session.add(startup)
        await test_session.commit()

        response = await async_client.get("/exports/startups")
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/csv"
        assert "attachment" in response.headers["content-disposition"]
        content = response.text
        assert "entity_name" in content
        assert "TestAI" in content

    @pytest.mark.asyncio
    async def test_export_products(self, async_client: AsyncClient, test_session):
        record = Record(
            source_name="test", source_url="https://example.com", record_type="product",
            content_hash="p1", raw_data={}, extraction_status="COMPLETED"
        )
        test_session.add(record)
        await test_session.commit()
        product = Product(record_id=record.id, product_name="TestProduct", pricing_model="freemium")
        test_session.add(product)
        await test_session.commit()

        response = await async_client.get("/exports/products")
        assert response.status_code == 200
        content = response.text
        assert "product_name" in content
        assert "TestProduct" in content

    @pytest.mark.asyncio
    async def test_export_papers(self, async_client: AsyncClient, test_session):
        record = Record(
            source_name="test", source_url="https://example.com", record_type="paper",
            content_hash="p1", raw_data={}, extraction_status="COMPLETED"
        )
        test_session.add(record)
        await test_session.commit()
        paper = ResearchPaper(record_id=record.id, title="Test Paper", authors=["Author"])
        test_session.add(paper)
        await test_session.commit()

        response = await async_client.get("/exports/papers")
        assert response.status_code == 200
        content = response.text
        assert "title" in content
        assert "Test Paper" in content

    @pytest.mark.asyncio
    async def test_export_jobs(self, async_client: AsyncClient, test_session):
        record = Record(
            source_name="test", source_url="https://example.com", record_type="job",
            content_hash="j1", raw_data={}, extraction_status="COMPLETED"
        )
        test_session.add(record)
        await test_session.commit()
        job = Job(record_id=record.id, title="AI Engineer", company_name="TestAI")
        test_session.add(job)
        await test_session.commit()

        response = await async_client.get("/exports/jobs")
        assert response.status_code == 200
        content = response.text
        assert "title" in content
        assert "AI Engineer" in content

    @pytest.mark.asyncio
    async def test_export_news(self, async_client: AsyncClient, test_session):
        record = Record(
            source_name="test", source_url="https://example.com", record_type="news",
            content_hash="n1", raw_data={}, extraction_status="COMPLETED"
        )
        test_session.add(record)
        await test_session.commit()
        news = News(record_id=record.id, headline="Test News", sentiment_score=0.5)
        test_session.add(news)
        await test_session.commit()

        response = await async_client.get("/exports/news")
        assert response.status_code == 200
        content = response.text
        assert "headline" in content
        assert "Test News" in content

    @pytest.mark.asyncio
    async def test_export_entities(self, async_client: AsyncClient, test_session):
        from app.models import EntityMappingLog
        
        log = EntityMappingLog(
            raw_entity_name="Test AI", canonical_entity_name="TestAI",
            match_method="FUZZY_HIGH", confidence_score=0.92,
            resolution_status="AUTO", required_human_review=False
        )
        test_session.add(log)
        await test_session.commit()

        response = await async_client.get("/exports/entities")
        assert response.status_code == 200
        content = response.text
        assert "raw_entity_name" in content
        assert "Test AI" in content

    @pytest.mark.asyncio
    async def test_export_unknown_type(self, async_client: AsyncClient):
        response = await async_client.get("/exports/unknown")
        assert response.status_code == 404


class TestStatsEndpoints:
    """Tests for analytics/stats endpoints."""

    @pytest.mark.asyncio
    async def test_ingestion_activity(self, async_client: AsyncClient, test_session):
        record = Record(
            source_name="test", source_url="https://example.com", record_type="startup",
            content_hash="a1", raw_data={}, collected_at=datetime.now(timezone.utc)
        )
        test_session.add(record)
        await test_session.commit()

        response = await async_client.get("/stats/ingestion-activity")
        assert response.status_code == 200
        data = response.json()
        assert "activity" in data

    @pytest.mark.asyncio
    async def test_source_distribution(self, async_client: AsyncClient, test_session):
        record = Record(
            source_name="test", source_url="https://example.com", record_type="startup",
            content_hash="s1", raw_data={}
        )
        test_session.add(record)
        await test_session.commit()

        response = await async_client.get("/stats/source-distribution")
        assert response.status_code == 200
        data = response.json()
        assert "distribution" in data

    @pytest.mark.asyncio
    async def test_record_type_distribution(self, async_client: AsyncClient, test_session):
        record = Record(
            source_name="test", source_url="https://example.com", record_type="startup",
            content_hash="s1", raw_data={}
        )
        test_session.add(record)
        await test_session.commit()

        response = await async_client.get("/stats/record-type-distribution")
        assert response.status_code == 200
        data = response.json()
        assert "distribution" in data

    @pytest.mark.asyncio
    async def test_freshness_timeline(self, async_client: AsyncClient, test_session):
        record = Record(
            source_name="test", source_url="https://example.com", record_type="news",
            content_hash="n1", raw_data={}
        )
        test_session.add(record)
        await test_session.commit()
        news = News(record_id=record.id, headline="Test", published_at=datetime.now(timezone.utc))
        test_session.add(news)
        await test_session.commit()

        response = await async_client.get("/stats/freshness-timeline")
        assert response.status_code == 200
        data = response.json()
        assert "news" in data
        assert "jobs" in data

    @pytest.mark.asyncio
    async def test_github_stars_distribution(self, async_client: AsyncClient, test_session):
        record = Record(
            source_name="test", source_url="https://example.com", record_type="paper",
            content_hash="p1", raw_data={}
        )
        test_session.add(record)
        await test_session.commit()
        paper = ResearchPaper(record_id=record.id, title="Test", github_stars=100)
        test_session.add(paper)
        await test_session.commit()

        response = await async_client.get("/stats/github-stars")
        assert response.status_code == 200
        data = response.json()
        assert "stars" in data
        assert 100 in data["stars"]

    @pytest.mark.asyncio
    async def test_extraction_status(self, async_client: AsyncClient, test_session):
        record = Record(
            source_name="test", source_url="https://example.com", record_type="startup",
            content_hash="s1", raw_data={}, extraction_status="COMPLETED"
        )
        test_session.add(record)
        await test_session.commit()

        response = await async_client.get("/stats/extraction-status")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data


# AsyncClient fixture
@pytest.fixture
async def async_client(test_session):
    # Override get_db dependency
    from app.database import get_db
    from app.main import app
    
    def override_get_db():
        yield test_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(base_url="http://test") as client:
        yield client
    
    app.dependency_overrides.clear()