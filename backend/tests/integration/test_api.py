"""PostgreSQL integration tests for API endpoints."""
import pytest
from datetime import datetime, timezone
from httpx import AsyncClient

from app.models import Record, Startup, Product, ResearchPaper, Job, News


class TestHealthEndpointPG:
    """Tests for health check endpoint with PostgreSQL."""

    @pytest.mark.asyncio
    async def test_health_check(self, pg_async_client: AsyncClient):
        response = await pg_async_client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data


class TestDashboardStatsPG:
    """Tests for dashboard stats endpoint with PostgreSQL."""

    @pytest.mark.asyncio
    async def test_dashboard_stats_empty(self, pg_async_client: AsyncClient, pg_test_session):
        response = await pg_async_client.get("/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        
        assert data["total_startups"] == 0
        assert data["total_products"] == 0
        assert data["total_papers"] == 0
        assert data["total_jobs"] == 0
        assert data["total_news"] == 0

    @pytest.mark.asyncio
    async def test_dashboard_stats_with_data(self, pg_async_client: AsyncClient, pg_test_session):
        # Create test data
        record = Record(
            source_name="test",
            source_url="https://example.com",
            record_type="startup",
            content_hash="abc123",
            raw_data={},
            extraction_status="COMPLETED",
        )
        pg_test_session.add(record)
        await pg_test_session.commit()
        await pg_test_session.refresh(record)

        startup = Startup(record_id=record.id, entity_name="TestAI")
        pg_test_session.add(startup)
        await pg_test_session.commit()

        response = await pg_async_client.get("/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        
        assert data["total_startups"] == 1
        assert data["successful_extractions"] == 1


class TestStartupsEndpointPG:
    """Tests for startups CRUD endpoints with PostgreSQL."""

    @pytest.mark.asyncio
    async def test_get_startups_empty(self, pg_async_client: AsyncClient):
        response = await pg_async_client.get("/api/startups")
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0

    @pytest.mark.asyncio
    async def test_get_startups_with_data(self, pg_async_client: AsyncClient, pg_test_session, sample_startup_data):
        record = Record(
            source_name="test",
            source_url="https://example.com/startup",
            record_type="startup",
            content_hash="startup123",
            raw_data={},
            extraction_status="COMPLETED",
        )
        pg_test_session.add(record)
        await pg_test_session.commit()
        await pg_test_session.refresh(record)

        startup = Startup(
            record_id=record.id,
            entity_name=sample_startup_data["entity_name"],
            description=sample_startup_data["description"],
            website=sample_startup_data["website"],
            industry=sample_startup_data["industry"],
            stage=sample_startup_data["stage"],
            founded_year=sample_startup_data["founded_year"],
            employee_count=sample_startup_data["employee_count"],
            total_funding_usd=sample_startup_data["total_funding_usd"],
            last_funding_round=sample_startup_data["last_funding_round"],
            last_funding_date=sample_startup_data["last_funding_date"],
            investors=sample_startup_data["investors"],
            headquarters=sample_startup_data["headquarters"],
            tags=sample_startup_data["tags"],
        )
        pg_test_session.add(startup)
        await pg_test_session.commit()
        await pg_test_session.refresh(startup)

        response = await pg_async_client.get("/api/startups")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1
        assert data["items"][0]["entity_name"] == sample_startup_data["entity_name"]

    @pytest.mark.asyncio
    async def test_get_startup_by_id(self, pg_async_client: AsyncClient, pg_test_session, sample_startup_data):
        record = Record(
            source_name="test",
            source_url="https://example.com/startup",
            record_type="startup",
            content_hash="startup123",
            raw_data={},
            extraction_status="COMPLETED",
        )
        pg_test_session.add(record)
        await pg_test_session.commit()
        await pg_test_session.refresh(record)

        startup = Startup(
            record_id=record.id,
            entity_name=sample_startup_data["entity_name"],
            description=sample_startup_data["description"],
        )
        pg_test_session.add(startup)
        await pg_test_session.commit()
        await pg_test_session.refresh(startup)

        response = await pg_async_client.get(f"/api/startups/{startup.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["entity_name"] == sample_startup_data["entity_name"]
        assert data["id"] == str(startup.id)

    @pytest.mark.asyncio
    async def test_get_startup_not_found(self, pg_async_client: AsyncClient):
        response = await pg_async_client.get("/api/startups/00000000-0000-0000-0000-000000000000")
        assert response.status_code == 404


class TestProductsEndpointPG:
    """Tests for products CRUD endpoints with PostgreSQL."""

    @pytest.mark.asyncio
    async def test_get_products_empty(self, pg_async_client: AsyncClient):
        response = await pg_async_client.get("/api/products")
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0

    @pytest.mark.asyncio
    async def test_get_products_with_data(self, pg_async_client: AsyncClient, pg_test_session, sample_product_data):
        record = Record(
            source_name="test",
            source_url="https://example.com/product",
            record_type="product",
            content_hash="product123",
            raw_data={},
            extraction_status="COMPLETED",
        )
        pg_test_session.add(record)
        await pg_test_session.commit()
        await pg_test_session.refresh(record)

        product = Product(
            record_id=record.id,
            product_name=sample_product_data["product_name"],
            description=sample_product_data["description"],
            website=sample_product_data["website"],
            pricing_model=sample_product_data["pricing_model"],
            starting_price_usd=sample_product_data["starting_price_usd"],
            category=sample_product_data["category"],
            tags=sample_product_data["tags"],
            key_features=sample_product_data["key_features"],
            integrations=sample_product_data["integrations"],
            company_name=sample_product_data["company_name"],
            launch_date=sample_product_data["launch_date"],
        )
        pg_test_session.add(product)
        await pg_test_session.commit()
        await pg_test_session.refresh(product)

        response = await pg_async_client.get("/api/products")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1
        assert data["items"][0]["product_name"] == sample_product_data["product_name"]


class TestPapersEndpointPG:
    """Tests for research papers CRUD endpoints with PostgreSQL."""

    @pytest.mark.asyncio
    async def test_get_papers_empty(self, pg_async_client: AsyncClient):
        response = await pg_async_client.get("/api/papers")
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0

    @pytest.mark.asyncio
    async def test_get_papers_with_data(self, pg_async_client: AsyncClient, pg_test_session, sample_paper_data):
        record = Record(
            source_name="test",
            source_url="https://example.com/paper",
            record_type="paper",
            content_hash="paper123",
            raw_data={},
            extraction_status="COMPLETED",
        )
        pg_test_session.add(record)
        await pg_test_session.commit()
        await pg_test_session.refresh(record)

        paper = ResearchPaper(
            record_id=record.id,
            title=sample_paper_data["title"],
            authors=sample_paper_data["authors"],
            abstract=sample_paper_data["abstract"],
            venue=sample_paper_data["venue"],
            published_date=sample_paper_data["published_date"],
            doi=sample_paper_data["doi"],
            arxiv_id=sample_paper_data["arxiv_id"],
            paper_url=sample_paper_data["paper_url"],
            pdf_url=sample_paper_data["pdf_url"],
            github_url=sample_paper_data["github_url"],
            github_stars=sample_paper_data["github_stars"],
            github_forks=sample_paper_data["github_forks"],
            topics=sample_paper_data["topics"],
            tasks=sample_paper_data["tasks"],
            datasets=sample_paper_data["datasets"],
        )
        pg_test_session.add(paper)
        await pg_test_session.commit()
        await pg_test_session.refresh(paper)

        response = await pg_async_client.get("/api/papers")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1
        assert data["items"][0]["title"] == sample_paper_data["title"]


class TestJobsEndpointPG:
    """Tests for jobs CRUD endpoints with PostgreSQL."""

    @pytest.mark.asyncio
    async def test_get_jobs_empty(self, pg_async_client: AsyncClient):
        response = await pg_async_client.get("/api/jobs")
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0

    @pytest.mark.asyncio
    async def test_get_jobs_with_data(self, pg_async_client: AsyncClient, pg_test_session, sample_job_data):
        record = Record(
            source_name="test",
            source_url="https://example.com/job",
            record_type="job",
            content_hash="job123",
            raw_data={},
            extraction_status="COMPLETED",
        )
        pg_test_session.add(record)
        await pg_test_session.commit()
        await pg_test_session.refresh(record)

        job = Job(
            record_id=record.id,
            title=sample_job_data["title"],
            company_name=sample_job_data["company_name"],
            company=sample_job_data["company"],
            description=sample_job_data["description"],
            requirements=sample_job_data["requirements"],
            job_url=sample_job_data["job_url"],
            application_url=sample_job_data["application_url"],
            location=sample_job_data["location"],
            is_remote=sample_job_data["is_remote"],
            employment_type=sample_job_data["employment_type"],
            experience_level=sample_job_data["experience_level"],
            role_family=sample_job_data["role_family"],
            salary_min_usd=sample_job_data["salary_min_usd"],
            salary_max_usd=sample_job_data["salary_max_usd"],
            currency=sample_job_data["currency"],
            visa_sponsorship=sample_job_data["visa_sponsorship"],
            published_date=sample_job_data["published_date"],
        )
        pg_test_session.add(job)
        await pg_test_session.commit()
        await pg_test_session.refresh(job)

        response = await pg_async_client.get("/api/jobs")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1
        assert data["items"][0]["title"] == sample_job_data["title"]

    @pytest.mark.asyncio
    async def test_get_jobs_fresh_filter(self, pg_async_client: AsyncClient, pg_test_session, sample_job_data):
        record = Record(
            source_name="test",
            source_url="https://example.com/job",
            record_type="job",
            content_hash="job123",
            raw_data={},
            extraction_status="COMPLETED",
        )
        pg_test_session.add(record)
        await pg_test_session.commit()
        await pg_test_session.refresh(record)

        job = Job(
            record_id=record.id,
            title=sample_job_data["title"],
            company_name=sample_job_data["company_name"],
            company=sample_job_data["company"],
            job_url=sample_job_data["job_url"],
            application_url=sample_job_data["application_url"],
            location=sample_job_data["location"],
            is_remote=sample_job_data["is_remote"],
            employment_type=sample_job_data["employment_type"],
            experience_level=sample_job_data["experience_level"],
            role_family=sample_job_data["role_family"],
            salary_min_usd=sample_job_data["salary_min_usd"],
            salary_max_usd=sample_job_data["salary_max_usd"],
            currency=sample_job_data["currency"],
            visa_sponsorship=sample_job_data["visa_sponsorship"],
            published_date=sample_job_data["published_date"],
        )
        pg_test_session.add(job)
        await pg_test_session.commit()

        response = await pg_async_client.get("/api/jobs?fresh=true")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1


class TestNewsEndpointPG:
    """Tests for news CRUD endpoints with PostgreSQL."""

    @pytest.mark.asyncio
    async def test_get_news_empty(self, pg_async_client: AsyncClient):
        response = await pg_async_client.get("/api/news")
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0

    @pytest.mark.asyncio
    async def test_get_news_with_data(self, pg_async_client: AsyncClient, pg_test_session, sample_news_data):
        record = Record(
            source_name="test",
            source_url="https://example.com/news",
            record_type="news",
            content_hash="news123",
            raw_data={},
            extraction_status="COMPLETED",
        )
        pg_test_session.add(record)
        await pg_test_session.commit()
        await pg_test_session.refresh(record)

        news = News(
            record_id=record.id,
            headline=sample_news_data["headline"],
            summary=sample_news_data["summary"],
            article_url=sample_news_data["article_url"],
            author=sample_news_data["author"],
            published_at=sample_news_data["published_at"],
            source_name=sample_news_data["source_name"],
            source_category=sample_news_data["source_category"],
            tags=sample_news_data["tags"],
            mentioned_entities=sample_news_data["mentioned_entities"],
            sentiment_score=sample_news_data["sentiment_score"],
        )
        pg_test_session.add(news)
        await pg_test_session.commit()
        await pg_test_session.refresh(news)

        response = await pg_async_client.get("/api/news")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1
        assert data["items"][0]["headline"] == sample_news_data["headline"]


class TestExportEndpointsPG:
    """Tests for export endpoints with PostgreSQL."""

    @pytest.mark.asyncio
    async def test_export_startups_csv(self, pg_async_client: AsyncClient, pg_test_session, sample_startup_data):
        record = Record(
            source_name="test",
            source_url="https://example.com/startup",
            record_type="startup",
            content_hash="startup123",
            raw_data={},
            extraction_status="COMPLETED",
        )
        pg_test_session.add(record)
        await pg_test_session.commit()
        await pg_test_session.refresh(record)

        startup = Startup(
            record_id=record.id,
            entity_name=sample_startup_data["entity_name"],
        )
        pg_test_session.add(startup)
        await pg_test_session.commit()

        response = await pg_async_client.get("/api/exports/startups?format=csv")
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/csv; charset=utf-8"

    @pytest.mark.asyncio
    async def test_export_products_csv(self, pg_async_client: AsyncClient, pg_test_session, sample_product_data):
        record = Record(
            source_name="test",
            source_url="https://example.com/product",
            record_type="product",
            content_hash="product123",
            raw_data={},
            extraction_status="COMPLETED",
        )
        pg_test_session.add(record)
        await pg_test_session.commit()
        await pg_test_session.refresh(record)

        product = Product(
            record_id=record.id,
            product_name=sample_product_data["product_name"],
        )
        pg_test_session.add(product)
        await pg_test_session.commit()

        response = await pg_async_client.get("/api/exports/products?format=csv")
        assert response.status_code == 200
        assert "text/csv" in response.headers["content-type"]
        content = response.text
        assert "product_name" in content


class TestEntityResolutionEndpointsPG:
    """Tests for entity resolution endpoints with PostgreSQL."""

    @pytest.mark.asyncio
    async def test_get_entities(self, pg_async_client: AsyncClient):
        response = await pg_async_client.get("/api/entities/mappings")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data

    @pytest.mark.asyncio
    async def test_get_entity_by_id(self, pg_async_client: AsyncClient, pg_test_session, sample_startup_data):
        record = Record(
            source_name="test",
            source_url="https://example.com/startup",
            record_type="startup",
            content_hash="startup123",
            raw_data={},
            extraction_status="COMPLETED",
        )
        pg_test_session.add(record)
        await pg_test_session.commit()
        await pg_test_session.refresh(record)

        startup = Startup(
            record_id=record.id,
            entity_name=sample_startup_data["entity_name"],
        )
        pg_test_session.add(startup)
        await pg_test_session.commit()
        await pg_test_session.refresh(startup)

        response = await pg_async_client.get(f"/api/startups/{startup.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(startup.id)


class TestSourcesEndpointsPG:
    """Tests for sources endpoints with PostgreSQL."""

    @pytest.mark.asyncio
    async def test_get_sources(self, pg_async_client: AsyncClient):
        response = await pg_async_client.get("/api/sources")
        assert response.status_code == 200
        data = response.json()
        assert "sources" in data