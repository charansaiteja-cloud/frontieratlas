"""Ingestion pipelines with deduplication and freshness validation."""
import asyncio
import hashlib
import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any

from loguru import logger
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.config import settings
from app.database import AsyncSessionLocal
from app.models import (
    Record, Startup, Product, ResearchPaper, Job, News,
    CanonicalEntity, EntityMappingLog, SourceHealth, PipelineTask
)
from app.schemas import (
    StartupSchema, ProductSchema, ResearchPaperSchema, JobSchema, NewsSchema,
    ExtractionStatus, make_content_hash
)
from app.crawlers import (
    STARTUP_ADAPTERS, PRODUCT_ADAPTERS, PAPER_ADAPTERS, NEWS_ADAPTERS, JOB_ADAPTERS
)
from app.llm import llm_extractor
from app.resolvers import entity_resolver


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def is_fresh(published: datetime | None) -> bool:
    if not published:
        return False
    if published.tzinfo is None:
        published = published.replace(tzinfo=timezone.utc)
    return (utcnow() - published) < timedelta(hours=settings.fresh_window_hours)


class IngestionPipeline:
    def __init__(self):
        self.adapters = {
            "startup": STARTUP_ADAPTERS,
            "product": PRODUCT_ADAPTERS,
            "paper": PAPER_ADAPTERS,
            "news": NEWS_ADAPTERS,
            "job": JOB_ADAPTERS,
        }

    async def run_full_pipeline(self) -> dict:
        """Run all ingestion pipelines."""
        results = {}
        for record_type, adapters in self.adapters.items():
            logger.info(f"Starting {record_type} ingestion...")
            result = await self.run_type_pipeline(record_type, adapters)
            results[record_type] = result
        return results

    async def run_type_pipeline(self, record_type: str, adapters: list) -> dict:
        total_collected = 0
        total_stored = 0
        total_duplicates = 0
        total_failed = 0

        for adapter in adapters:
            try:
                logger.info(f"Collecting from {adapter.source_name}...")
                raw_records = await adapter.collect()
                total_collected += len(raw_records)

                for raw in raw_records:
                    stored, is_dup = await self.process_record(record_type, adapter, raw)
                    if stored:
                        total_stored += 1
                    if is_dup:
                        total_duplicates += 1

            except Exception as e:
                logger.error(f"Adapter {adapter.source_name} failed: {e}")
                total_failed += 1
                await self.update_source_health(adapter.source_name, "FAILED", str(e))
                continue

            await self.update_source_health(adapter.source_name, "SUCCESS", "", len(raw_records) if 'raw_records' in locals() else 0)

        return {
            "collected": total_collected,
            "stored": total_stored,
            "duplicates": total_duplicates,
            "failed": total_failed,
        }

    async def process_record(self, record_type: str, adapter, raw: dict) -> tuple[bool, bool]:
        """Process a single raw record through the pipeline."""
        source_url = raw.get("source_url", adapter.source_url)
        content_hash = make_content_hash(record_type, source_url, raw)

        # Freshness check for news and jobs
        if record_type in ("news", "job"):
            published = None
            if record_type == "news":
                published = raw.get("published_at")
            else:
                published = raw.get("published_date")
            if isinstance(published, str):
                try:
                    published = datetime.fromisoformat(published.replace("Z", "+00:00"))
                except Exception:
                    published = None
            if not is_fresh(published):
                return False, False  # not fresh, skip

        async with AsyncSessionLocal() as db:
            # Check deduplication
            stmt = select(Record).where(
                Record.record_type == record_type,
                Record.content_hash == content_hash
            )
            result = await db.execute(stmt)
            existing = result.scalar_one_or_none()

            if existing:
                return False, True  # duplicate

            # Create record
            record = Record(
                record_type=record_type,
                source_name=adapter.source_name,
                source_url=source_url,
                raw_data=raw,
                content_hash=content_hash,
                extraction_status=ExtractionStatus.PENDING,
            )
            db.add(record)
            await db.flush()

            # Create type-specific entity
            await self.create_entity(record_type, record.id, raw, db)

            # LLM extraction
            await self.run_llm_extraction(record_type, record.id, raw, db)

            # Entity resolution
            await self.run_entity_resolution(record_type, record.id, raw, db)

            await db.commit()
            return True, False

    async def create_entity(self, record_type: str, record_id: uuid.UUID, raw: dict, db):
        """Create type-specific entity from raw data."""
        if record_type == "startup":
            entity = Startup(
                record_id=record_id,
                entity_name=raw.get("entity_name") or raw.get("title", ""),
                description=raw.get("abstract") or raw.get("description"),
                website=raw.get("website"),
                employee_count=raw.get("employee_count"),
                industry=raw.get("industry"),
                headquarters=raw.get("headquarters"),
                founding_year=raw.get("founding_year"),
            )
        elif record_type == "product":
            entity = Product(
                record_id=record_id,
                product_name=raw.get("product_name", ""),
                product_url=raw.get("product_url"),
                description=raw.get("abstract") or raw.get("description"),
                startup_name=raw.get("startup_name"),
                pricing_model=raw.get("pricing_model", "UNKNOWN"),
            )
        elif record_type == "paper":
            published = raw.get("published_date")
            if isinstance(published, str):
                try:
                    published = datetime.fromisoformat(published.replace("Z", "+00:00"))
                except Exception:
                    published = utcnow()
            entity = ResearchPaper(
                record_id=record_id,
                title=raw.get("title", ""),
                authors=raw.get("authors", []),
                abstract=raw.get("abstract"),
                paper_url=raw.get("paper_url", ""),
                arxiv_id=raw.get("arxiv_id"),
                github_url=raw.get("github_url"),
                github_stars=raw.get("github_stars"),
                github_repo_owner=raw.get("github_repo_owner"),
                github_repo_name=raw.get("github_repo_name"),
                published_date=published or utcnow(),
                metrics_updated_at=utcnow(),
            )
        elif record_type == "job":
            published = raw.get("published_date")
            if isinstance(published, str):
                try:
                    published = datetime.fromisoformat(published.replace("Z", "+00:00"))
                except Exception:
                    published = utcnow()
            entity = Job(
                record_id=record_id,
                company=raw.get("company", ""),
                title=raw.get("title", ""),
                job_url=raw.get("job_url", ""),
                description=raw.get("abstract") or raw.get("description"),
                location=raw.get("location"),
                is_remote=raw.get("is_remote", False),
                employment_type=raw.get("employment_type"),
                role_family=raw.get("role_family"),
                published_date=published or utcnow(),
            )
        elif record_type == "news":
            published = raw.get("published_at")
            if isinstance(published, str):
                try:
                    published = datetime.fromisoformat(published.replace("Z", "+00:00"))
                except Exception:
                    published = utcnow()
            entity = News(
                record_id=record_id,
                headline=raw.get("headline", ""),
                author=raw.get("author"),
                published_at=published or utcnow(),
                full_text=raw.get("full_text"),
                article_url=raw.get("article_url", ""),
                source_name=raw.get("source_name", ""),
            )
        else:
            return

        db.add(entity)

    async def run_llm_extraction(self, record_type: str, record_id: uuid.UUID, raw: dict, db):
        """Run LLM extraction on the record."""
        from app.models import Record

        # Update status
        stmt = select(Record).where(Record.id == record_id)
        result = await db.execute(stmt)
        record = result.scalar_one_or_none()
        if not record:
            return

        record.extraction_status = ExtractionStatus.PROCESSING
        await db.commit()

        # Prepare content for extraction
        content = json.dumps(raw, default=str)

        # Run extraction
        schemas = {
            "startup": StartupSchema,
            "product": ProductSchema,
            "paper": ResearchPaperSchema,
            "job": JobSchema,
            "news": NewsSchema,
        }
        schema = schemas.get(record_type)
        if not schema:
            record.extraction_status = ExtractionStatus.FAILED
            await db.commit()
            return

        result = await llm_extractor.extract(record_type, content, schema)

        if result["extraction_status"] == "COMPLETED" and result["extracted_data"]:
            # Update entity with extracted data
            await self.update_entity_from_extraction(record_type, record_id, result["extracted_data"], db)
            record.extraction_status = ExtractionStatus.COMPLETED
        elif result["extraction_status"] == "PARTIALLY_COMPLETED":
            await self.update_entity_from_extraction(record_type, record_id, result["extracted_data"], db)
            record.extraction_status = ExtractionStatus.PARTIALLY_COMPLETED
        else:
            record.extraction_status = ExtractionStatus.FAILED

        await db.commit()

    async def update_entity_from_extraction(self, record_type: str, record_id: uuid.UUID, extracted: dict, db):
        """Update entity with LLM-extracted data."""
        from sqlalchemy import select

        if record_type == "startup":
            stmt = select(Startup).where(Startup.record_id == record_id)
        elif record_type == "product":
            stmt = select(Product).where(Product.record_id == record_id)
        elif record_type == "paper":
            stmt = select(ResearchPaper).where(ResearchPaper.record_id == record_id)
        elif record_type == "job":
            stmt = select(Job).where(Job.record_id == record_id)
        elif record_type == "news":
            stmt = select(News).where(News.record_id == record_id)
        else:
            return

        result = await db.execute(stmt)
        entity = result.scalar_one_or_none()
        if not entity:
            return

        for key, value in extracted.items():
            if hasattr(entity, key) and value not in (None, "", []):
                setattr(entity, key, value)

    async def run_entity_resolution(self, record_type: str, record_id: uuid.UUID, raw: dict, db):
        """Run entity resolution on the record."""
        if record_type == "startup":
            entity_name = raw.get("entity_name")
            if not entity_name:
                return
            entity_type = "startup"
            source_url = raw.get("source_url", "")
        elif record_type == "product":
            entity_name = raw.get("startup_name") or raw.get("product_name")
            if not entity_name:
                return
            entity_type = "product"
            source_url = raw.get("source_url", "")
        elif record_type == "job":
            entity_name = raw.get("company")
            if not entity_name:
                return
            entity_type = "startup"
            source_url = raw.get("source_url", "")
        elif record_type == "news":
            entity_name = raw.get("source_name")
            if not entity_name:
                return
            entity_type = "news_source"
            source_url = raw.get("source_url", "")
        else:
            return

        mapping = await entity_resolver.resolve(entity_name, entity_type, source_url)

        if mapping and mapping.canonical_entity_id:
            # Update entity with canonical ID
            await self.update_canonical_id(record_type, record_id, uuid.UUID(mapping.canonical_entity_id), db)

    async def update_canonical_id(self, record_type: str, record_id: uuid.UUID, canonical_id: uuid.UUID, db):
        from sqlalchemy import select

        if record_type == "startup":
            stmt = select(Startup).where(Startup.record_id == record_id)
        elif record_type == "product":
            stmt = select(Product).where(Product.record_id == record_id)
        elif record_type == "job":
            stmt = select(Job).where(Job.record_id == record_id)
        elif record_type == "news":
            stmt = select(News).where(News.record_id == record_id)
        else:
            return

        result = await db.execute(stmt)
        entity = result.scalar_one_or_none()
        if entity:
            entity.canonical_entity_id = canonical_id

    async def update_source_health(self, source_name: str, status: str, error: str = "", records: int = 0):
        async with AsyncSessionLocal() as db:
            from sqlalchemy import select
            stmt = select(SourceHealth).where(SourceHealth.source_name == source_name)
            result = await db.execute(stmt)
            health = result.scalar_one_or_none()

            if not health:
                health = SourceHealth(source_name=source_name, source_type=record_type if 'record_type' in locals() else "unknown")
                db.add(health)

            health.last_crawl_status = status
            if status == "SUCCESS":
                health.last_successful_crawl = utcnow()
                if health.records_discovered is None:
                    health.records_discovered = 0
                health.records_discovered += records
                if health.failure_count is None:
                    health.failure_count = 0
                health.failure_count = 0
                health.health_status = "HEALTHY"
            else:
                if health.failure_count is None:
                    health.failure_count = 0
                health.failure_count += 1
                health.blocked_reason = error
                health.health_status = "DEGRADED" if health.failure_count < 3 else "BLOCKED"

            await db.commit()


pipeline = IngestionPipeline()