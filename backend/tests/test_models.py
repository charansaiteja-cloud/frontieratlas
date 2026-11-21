"""Tests for database models."""
import pytest
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Record, Startup, Product, ResearchPaper, Job, News,
    CanonicalEntity, EntityMappingLog, SourceHealth, PipelineTask
)


class TestRecordModel:
    """Tests for the base Record model."""

    @pytest.mark.asyncio
    async def test_create_record(self, test_session: AsyncSession):
        record = Record(
            source_name="test_source",
            source_url="https://example.com/test",
            record_type="startup",
            content_hash="abc123",
            raw_data={"key": "value"},
            extraction_status="PENDING",
        )
        test_session.add(record)
        await test_session.commit()
        await test_session.refresh(record)

        assert record.id is not None
        assert record.source_name == "test_source"
        assert record.record_type == "startup"
        assert record.extraction_status == "PENDING"
        assert record.collected_at is not None


class TestStartupModel:
    """Tests for the Startup model."""

    @pytest.mark.asyncio
    async def test_create_startup(self, test_session: AsyncSession, sample_startup_data):
        # First create a record
        record = Record(
            source_name="test_source",
            source_url="https://example.com/startup",
            record_type="startup",
            content_hash="startup123",
            raw_data=sample_startup_data,
        )
        test_session.add(record)
        await test_session.commit()
        await test_session.refresh(record)

        # Create startup linked to record
        startup = Startup(
            record_id=record.id,
            **sample_startup_data
        )
        test_session.add(startup)
        await test_session.commit()
        await test_session.refresh(startup)

        assert startup.id is not None
        assert startup.record_id == record.id
        assert startup.entity_name == sample_startup_data["entity_name"]
        assert startup.industry == sample_startup_data["industry"]
        assert startup.investors == sample_startup_data["investors"]


class TestProductModel:
    """Tests for the Product model."""

    @pytest.mark.asyncio
    async def test_create_product(self, test_session: AsyncSession, sample_product_data):
        record = Record(
            source_name="test_source",
            source_url="https://example.com/product",
            record_type="product",
            content_hash="product123",
            raw_data=sample_product_data,
        )
        test_session.add(record)
        await test_session.commit()
        await test_session.refresh(record)

        product = Product(
            record_id=record.id,
            **sample_product_data
        )
        test_session.add(product)
        await test_session.commit()
        await test_session.refresh(product)

        assert product.id is not None
        assert product.record_id == record.id
        assert product.product_name == sample_product_data["product_name"]
        assert product.pricing_model == sample_product_data["pricing_model"]
        assert product.tags == sample_product_data["tags"]


class TestResearchPaperModel:
    """Tests for the ResearchPaper model."""

    @pytest.mark.asyncio
    async def test_create_paper(self, test_session: AsyncSession, sample_paper_data):
        record = Record(
            source_name="test_source",
            source_url="https://example.com/paper",
            record_type="paper",
            content_hash="paper123",
            raw_data=sample_paper_data,
        )
        test_session.add(record)
        await test_session.commit()
        await test_session.refresh(record)

        paper = ResearchPaper(
            record_id=record.id,
            **sample_paper_data
        )
        test_session.add(paper)
        await test_session.commit()
        await test_session.refresh(paper)

        assert paper.id is not None
        assert paper.record_id == record.id
        assert paper.title == sample_paper_data["title"]
        assert paper.authors == sample_paper_data["authors"]
        assert paper.github_stars == sample_paper_data["github_stars"]


class TestJobModel:
    """Tests for the Job model."""

    @pytest.mark.asyncio
    async def test_create_job(self, test_session: AsyncSession, sample_job_data):
        record = Record(
            source_name="test_source",
            source_url="https://example.com/job",
            record_type="job",
            content_hash="job123",
            raw_data=sample_job_data,
        )
        test_session.add(record)
        await test_session.commit()
        await test_session.refresh(record)

        job = Job(
            record_id=record.id,
            **sample_job_data
        )
        test_session.add(job)
        await test_session.commit()
        await test_session.refresh(job)

        assert job.id is not None
        assert job.record_id == record.id
        assert job.title == sample_job_data["title"]
        assert job.company_name == sample_job_data["company_name"]
        assert job.is_remote == sample_job_data["is_remote"]
        assert job.salary_min_usd == sample_job_data["salary_min_usd"]


class TestNewsModel:
    """Tests for the News model."""

    @pytest.mark.asyncio
    async def test_create_news(self, test_session: AsyncSession, sample_news_data):
        record = Record(
            source_name="test_source",
            source_url="https://example.com/news",
            record_type="news",
            content_hash="news123",
            raw_data=sample_news_data,
        )
        test_session.add(record)
        await test_session.commit()
        await test_session.refresh(record)

        news = News(
            record_id=record.id,
            **sample_news_data
        )
        test_session.add(news)
        await test_session.commit()
        await test_session.refresh(news)

        assert news.id is not None
        assert news.record_id == record.id
        assert news.headline == sample_news_data["headline"]
        assert news.sentiment_score == sample_news_data["sentiment_score"]
        assert news.tags == sample_news_data["tags"]


class TestCanonicalEntityModel:
    """Tests for the CanonicalEntity model."""

    @pytest.mark.asyncio
    async def test_create_canonical_entity(self, test_session: AsyncSession):
        entity = CanonicalEntity(
            canonical_name="TestAI",
            entity_type="company",
            description="A test AI company",
            aliases=["Test AI", "TestAI Inc"],
            website="https://testai.example.com",
            industry="Artificial Intelligence",
            headquarters="San Francisco, CA",
            founded_year=2023,
            metadata={"source": "test"},
        )
        test_session.add(entity)
        await test_session.commit()
        await test_session.refresh(entity)

        assert entity.id is not None
        assert entity.canonical_name == "TestAI"
        assert entity.entity_type == "company"
        assert entity.aliases == ["Test AI", "TestAI Inc"]


class TestEntityMappingLogModel:
    """Tests for the EntityMappingLog model."""

    @pytest.mark.asyncio
    async def test_create_mapping_log(self, test_session: AsyncSession):
        log = EntityMappingLog(
            raw_entity_name="Test AI Inc",
            canonical_entity_name="TestAI",
            match_method="FUZZY_HIGH",
            confidence_score=0.92,
            resolution_status="AUTO",
            required_human_review=False,
            source_url="https://example.com/source",
            match_details={"algorithm": "rapidfuzz", "score": 92},
        )
        test_session.add(log)
        await test_session.commit()
        await test_session.refresh(log)

        assert log.id is not None
        assert log.raw_entity_name == "Test AI Inc"
        assert log.canonical_entity_name == "TestAI"
        assert log.confidence_score == 0.92
        assert log.resolution_status == "AUTO"


class TestSourceHealthModel:
    """Tests for the SourceHealth model."""

    @pytest.mark.asyncio
    async def test_create_source_health(self, test_session: AsyncSession):
        source = SourceHealth(
            source_name="test_source",
            source_type="startup",
            source_url="https://example.com",
            health_status="HEALTHY",
            records_discovered=100,
            failure_count=0,
            last_successful_crawl=datetime.now(timezone.utc),
            last_crawl_status="SUCCESS",
        )
        test_session.add(source)
        await test_session.commit()
        await test_session.refresh(source)

        assert source.id is not None
        assert source.source_name == "test_source"
        assert source.health_status == "HEALTHY"
        assert source.records_discovered == 100


class TestPipelineTaskModel:
    """Tests for the PipelineTask model."""

    @pytest.mark.asyncio
    async def test_create_pipeline_task(self, test_session: AsyncSession):
        task = PipelineTask(
            task_id="test-task-123",
            task_type="startup",
            source_name="test_source",
            status="RUNNING",
            attempt_count=1,
            max_attempts=3,
            started_at=datetime.now(timezone.utc),
        )
        test_session.add(task)
        await test_session.commit()
        await test_session.refresh(task)

        assert task.id is not None
        assert task.task_id == "test-task-123"
        assert task.task_type == "startup"
        assert task.status == "RUNNING"