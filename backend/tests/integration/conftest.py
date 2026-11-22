"""PostgreSQL integration test configuration for FrontierAtlas backend."""
import pytest
import asyncio
from datetime import datetime, timezone
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import text

from app.models import Base
from app.models import Record, Startup, Product, ResearchPaper, Job, News
from app.main import app
from app.config import settings
from app.database import get_db
from httpx import AsyncClient, ASGITransport


# Test database URL - uses Docker PostgreSQL
# Host port is 5434, container port is 5432
TEST_PG_DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5434/frontieratlas_test"


@pytest.fixture(scope="function")
async def pg_test_engine():
    """Create a PostgreSQL test database engine."""
    # First, create the test database if it doesn't exist
    admin_engine = create_async_engine(
        "postgresql+asyncpg://postgres:postgres@localhost:5434/postgres",
        isolation_level="AUTOCOMMIT",
    )
    
    async with admin_engine.connect() as conn:
        # Terminate existing connections to test database
        await conn.execute(text("""
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = 'frontieratlas_test' AND pid <> pg_backend_pid()
        """))
        # Drop and recreate test database
        await conn.execute(text("DROP DATABASE IF EXISTS frontieratlas_test"))
        await conn.execute(text("CREATE DATABASE frontieratlas_test"))
    
    await admin_engine.dispose()
    
    # Now create engine for test database
    engine = create_async_engine(
        TEST_PG_DATABASE_URL,
        echo=False,
    )
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    await engine.dispose()
    
    # Clean up test database
    admin_engine = create_async_engine(
        "postgresql+asyncpg://postgres:postgres@localhost:5434/postgres",
        isolation_level="AUTOCOMMIT",
    )
    async with admin_engine.connect() as conn:
        await conn.execute(text("""
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = 'frontieratlas_test' AND pid <> pg_backend_pid()
        """))
        await conn.execute(text("DROP DATABASE IF EXISTS frontieratlas_test"))
    await admin_engine.dispose()


@pytest.fixture(scope="function")
async def pg_test_session(pg_test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create a PostgreSQL test database session."""
    async_session = async_sessionmaker(
        pg_test_engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session() as session:
        yield session


@pytest.fixture(scope="function")
async def pg_async_client(pg_test_session):
    """Create an AsyncClient for testing FastAPI endpoints with PostgreSQL test database."""
    async def override_get_db():
        yield pg_test_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client
    
    app.dependency_overrides.clear()


@pytest.fixture
def sample_startup_data():
    """Sample startup data for testing."""
    return {
        "entity_name": "TestAI",
        "description": "An AI startup for testing",
        "website": "https://testai.example.com",
        "industry": "Artificial Intelligence",
        "stage": "Series A",
        "founded_year": 2023,
        "employee_count": 25,
        "total_funding_usd": 5000000,
        "last_funding_round": "Series A",
        "last_funding_date": "2024-01-15",
        "investors": ["VC Fund 1", "Angel Investor"],
        "headquarters": "San Francisco, CA",
        "tags": ["AI", "ML", "NLP"],
    }


@pytest.fixture
def sample_product_data():
    """Sample product data for testing."""
    return {
        "product_name": "TestProduct",
        "description": "An AI product for testing",
        "website": "https://testproduct.example.com",
        "pricing_model": "freemium",
        "starting_price_usd": 29.0,
        "category": "Developer Tools",
        "tags": ["AI", "API", "automation"],
        "key_features": ["Feature 1", "Feature 2"],
        "integrations": ["Slack", "GitHub"],
        "company_name": "TestAI",
        "launch_date": "2024-01-01",
    }


@pytest.fixture
def sample_paper_data():
    """Sample research paper data for testing."""
    return {
        "title": "Test Paper: AI for Testing",
        "authors": ["Author One", "Author Two"],
        "abstract": "This paper tests AI for testing purposes.",
        "venue": "Test Conference 2024",
        "published_date": datetime(2024, 1, 15, tzinfo=timezone.utc),
        "doi": "10.1000/test.2024.001",
        "arxiv_id": "2401.12345",
        "paper_url": "https://arxiv.org/abs/2401.12345",
        "pdf_url": "https://arxiv.org/pdf/2401.12345.pdf",
        "github_url": "https://github.com/test/repo",
        "github_stars": 100,
        "github_forks": 25,
        "topics": ["machine-learning", "testing"],
        "tasks": ["classification"],
        "datasets": ["test-dataset"],
    }


@pytest.fixture
def sample_job_data():
    """Sample job data for testing."""
    return {
        "title": "Senior AI Engineer",
        "company_name": "TestAI",
        "company": "TestAI",
        "description": "We are looking for an AI engineer",
        "requirements": "Python, PyTorch, 5+ years experience",
        "job_url": "https://testai.example.com/jobs/1",
        "application_url": "https://testai.example.com/jobs/1",
        "location": "San Francisco, CA",
        "is_remote": True,
        "employment_type": "full-time",
        "experience_level": "senior",
        "role_family": "engineering",
        "salary_min_usd": 150000,
        "salary_max_usd": 250000,
        "currency": "USD",
        "visa_sponsorship": True,
        "published_date": datetime(2024, 1, 15, tzinfo=timezone.utc),
    }


@pytest.fixture
def sample_news_data():
    """Sample news data for testing."""
    return {
        "headline": "TestAI Raises Series A",
        "summary": "TestAI announces $5M Series A funding",
        "article_url": "https://techcrunch.com/2024/01/15/testai-series-a",
        "author": "Tech Reporter",
        "published_at": datetime(2024, 1, 15, 10, 0, 0, tzinfo=timezone.utc),
        "source_name": "TechCrunch",
        "source_category": "funding",
        "tags": ["AI", "funding", "startup"],
        "mentioned_entities": ["TestAI", "VC Fund 1"],
        "sentiment_score": 0.8,
    }


@pytest.fixture(autouse=True)
def override_settings(monkeypatch):
    """Override settings for tests."""
    monkeypatch.setattr(settings, "database_url", TEST_PG_DATABASE_URL)
    monkeypatch.setattr(settings, "redis_url", "redis://localhost:6379/1")
    monkeypatch.setattr(settings, "gemini_api_key", "test-gemini-key")
    monkeypatch.setattr(settings, "groq_api_key", "test-groq-key")
    monkeypatch.setattr(settings, "deepseek_api_key", "test-deepseek-key")
    monkeypatch.setattr(settings, "github_token", "test-github-token")