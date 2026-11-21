"""Database models for FrontierAtlas."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, DateTime,
    JSON, Index, UniqueConstraint, ForeignKey, Enum as SAEnum
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, relationship, synonym


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class Record(Base, TimestampMixin):
    __tablename__ = "records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    schema_version = Column(String, default="1.0", nullable=False)
    record_type = Column(String, nullable=False, index=True)
    source_name = Column(String, nullable=False, index=True)
    source_url = Column(Text, nullable=False, index=True)
    collected_at = Column(DateTime(timezone=True), default=utcnow, nullable=False, index=True)
    raw_data = Column(JSON, nullable=False)
    content_hash = Column(String, nullable=False, index=True)
    extraction_status = Column(
        SAEnum("PENDING", "PROCESSING", "COMPLETED", "FAILED", "PARTIALLY_COMPLETED", name="extraction_status"),
        default="PENDING", nullable=False, index=True
    )

    __table_args__ = (
        UniqueConstraint("record_type", "content_hash", name="uq_record_type_hash"),
        Index("ix_records_source_url_type", "source_url", "record_type"),
    )


class Startup(Base, TimestampMixin):
    __tablename__ = "startups"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    record_id = Column(UUID(as_uuid=True), ForeignKey("records.id", ondelete="CASCADE"), nullable=False, unique=True)
    entity_name = Column(String, nullable=False, index=True)
    founded_year = synonym("founding_year")
    description = Column(Text)
    website = Column(Text, index=True)
    employee_count = Column(Integer)
    industry = Column(String, index=True)
    headquarters = Column(String)
    founding_year = Column(Integer)
    stage = Column(String, index=True)
    total_funding_usd = Column(Integer)
    last_funding_round = Column(String)
    last_funding_date = Column(String)
    investors = Column(JSON, default=list)
    tags = Column(JSON, default=list)
    canonical_entity_id = Column(UUID(as_uuid=True), index=True)

    record = relationship("Record")


class Product(Base, TimestampMixin):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    record_id = Column(UUID(as_uuid=True), ForeignKey("records.id", ondelete="CASCADE"), nullable=False, unique=True)
    product_name = Column(String, nullable=False, index=True)
    product_url = Column(Text, index=True)
    description = Column(Text)
    website = Column(Text, index=True)
    startup_name = Column(String, index=True)
    pricing_model = Column(String, default="UNKNOWN", index=True)
    starting_price_usd = Column(Integer)
    category = Column(String, index=True)
    tags = Column(JSON, default=list)
    key_features = Column(JSON, default=list)
    integrations = Column(JSON, default=list)
    company_name = Column(String, index=True)
    launch_date = Column(String)
    canonical_entity_id = Column(UUID(as_uuid=True), index=True)

    record = relationship("Record")


class ResearchPaper(Base, TimestampMixin):
    __tablename__ = "research_papers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    record_id = Column(UUID(as_uuid=True), ForeignKey("records.id", ondelete="CASCADE"), nullable=False, unique=True)
    title = Column(String, nullable=False, index=True)
    authors = Column(JSON, nullable=False)
    abstract = Column(Text)
    paper_url = Column(Text, nullable=False, index=True)
    pdf_url = Column(Text)
    arxiv_id = Column(String, index=True)
    doi = Column(String)
    github_url = Column(Text, index=True)
    github_stars = Column(Integer)
    github_forks = Column(Integer)
    github_repo_owner = Column(String)
    github_repo_name = Column(String)
    published_date = Column(String, nullable=False, index=True)
    metrics_updated_at = Column(String)
    venue = Column(String)
    topics = Column(JSON, default=list)
    tasks = Column(JSON, default=list)
    datasets = Column(JSON, default=list)

    record = relationship("Record")


class Job(Base, TimestampMixin):
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    record_id = Column(UUID(as_uuid=True), ForeignKey("records.id", ondelete="CASCADE"), nullable=False, unique=True)
    company = Column(String, nullable=False, index=True)
    company_name = synonym("company")
    title = Column(String, nullable=False, index=True)
    job_url = Column(Text, nullable=False, index=True)
    application_url = Column(Text)
    description = Column(Text)
    requirements = Column(Text)
    location = Column(String)
    is_remote = Column(Boolean, default=False)
    employment_type = Column(String)
    experience_level = Column(String)
    role_family = Column(String, index=True)
    salary_min_usd = Column(Integer)
    salary_max_usd = Column(Integer)
    currency = Column(String, default="USD")
    visa_sponsorship = Column(Boolean, default=False)
    published_date = Column(String, nullable=False, index=True)
    canonical_entity_id = Column(UUID(as_uuid=True), index=True)

    record = relationship("Record")


class News(Base, TimestampMixin):
    __tablename__ = "news"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    record_id = Column(UUID(as_uuid=True), ForeignKey("records.id", ondelete="CASCADE"), nullable=False, unique=True)
    headline = Column(String, nullable=False, index=True)
    summary = Column(Text)
    article_url = Column(Text, nullable=False, index=True)
    url = synonym("article_url")
    author = Column(String)
    published_at = Column(String, nullable=False, index=True)
    full_text = Column(Text)
    source_name = Column(String, nullable=False, index=True)
    source_category = Column(String)
    tags = Column(JSON, default=list)
    mentioned_entities = Column(JSON, default=list)
    sentiment_score = Column(Float, default=0.0)
    canonical_entity_id = Column(UUID(as_uuid=True), index=True)

    record = relationship("Record")


class CanonicalEntity(Base, TimestampMixin):
    __tablename__ = "canonical_entities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_name = Column(String, nullable=False, unique=True, index=True)
    canonical_name = synonym("entity_name")
    normalized_name = Column(String, index=True, default="")
    entity_type = Column(String, nullable=False, index=True)
    website = Column(Text)
    description = Column(Text)
    industry = Column(String)
    headquarters = Column(String)
    founding_year = Column(Integer)
    founded_year = synonym("founding_year")
    aliases = Column(JSON, default=list)
    entity_metadata = Column(JSON)

    __table_args__ = (Index("ix_entities_normalized_type", "normalized_name", "entity_type"),)


class EntityMappingLog(Base, TimestampMixin):
    __tablename__ = "entity_mapping_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    raw_entity_name = Column(String, nullable=False, index=True)
    canonical_entity_name = Column(String, nullable=False, index=True)
    canonical_entity_id = Column(UUID(as_uuid=True), index=True)
    match_method = Column(String, nullable=False)
    confidence_score = Column(Float, nullable=False)
    source_url = Column(Text)
    required_human_review = Column(Boolean, default=False)
    resolution_status = Column(String, default="AUTO")
    match_details = Column(JSON)

    __table_args__ = (Index("ix_mappings_raw", "raw_entity_name"),)


class SourceHealth(Base, TimestampMixin):
    __tablename__ = "source_health"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_name = Column(String, nullable=False, unique=True, index=True)
    source_url = Column(Text)
    source_type = Column(String, nullable=False)
    last_successful_crawl = Column(DateTime(timezone=True))
    last_crawl_status = Column(String)
    records_discovered = Column(Integer, default=0)
    failure_count = Column(Integer, default=0)
    health_status = Column(String, default="UNKNOWN", index=True)
    blocked_reason = Column(Text)
    rate_limit_hit_at = Column(DateTime(timezone=True))


class PipelineTask(Base, TimestampMixin):
    __tablename__ = "pipeline_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(String, nullable=False, unique=True, index=True)
    task_type = Column(String, nullable=False, index=True)
    source_name = Column(String, index=True)
    status = Column(String, default="PENDING", index=True)
    attempt_count = Column(Integer, default=0)
    max_attempts = Column(Integer, default=3)
    last_error = Column(Text)
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    payload = Column(JSON)


class APISource(Base, TimestampMixin):
    """API Discovery Registry - stores metadata about discovered APIs."""
    __tablename__ = "api_sources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, unique=True, index=True)
    category = Column(String, nullable=False, index=True)  # machine_learning, news, jobs, development, etc.
    subcategory = Column(String, index=True)
    description = Column(Text)
    documentation_url = Column(Text)
    source_url = Column(Text)  # API base URL
    auth_type = Column(String, nullable=False)  # none, apiKey, OAuth, apiKey+OAuth
    https_support = Column(Boolean, default=True)
    cors_support = Column(String, default="Unknown")  # Yes, No, Unknown
    rate_limit = Column(String)  # e.g., "100/minute", "1000/day"
    free_tier = Column(Boolean, default=True)
    pricing_notes = Column(Text)
    status = Column(String, default="ACTIVE", index=True)  # ACTIVE, DEPRECATED, UNHEALTHY, DISABLED
    enabled = Column(Boolean, default=True, index=True)
    last_checked_at = Column(DateTime(timezone=True))
    last_successful_call = Column(DateTime(timezone=True))
    consecutive_failures = Column(Integer, default=0)
    health_status = Column(String, default="UNKNOWN", index=True)  # HEALTHY, DEGRADED, UNHEALTHY, UNKNOWN
    tags = Column(JSON, default=list)  # e.g., ["ai", "startups", "papers", "github"]
    provenance = Column(JSON, default=dict)  # Source of discovery (public-apis repo, manual, etc.)
    integration_priority = Column(Integer, default=0)  # Higher = more important to integrate
    adapter_class = Column(String)  # Name of adapter class if integrated

    __table_args__ = (
        Index("ix_api_sources_category_enabled", "category", "enabled"),
        Index("ix_api_sources_status_health", "status", "health_status"),
    )


class APISourceHealthLog(Base, TimestampMixin):
    """Health check history for API sources."""
    __tablename__ = "api_source_health_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    api_source_id = Column(UUID(as_uuid=True), ForeignKey("api_sources.id", ondelete="CASCADE"), nullable=False, index=True)
    status_code = Column(Integer)
    response_time_ms = Column(Integer)
    success = Column(Boolean, default=False)
    error_message = Column(Text)
    rate_limit_remaining = Column(String)
    rate_limit_reset = Column(DateTime(timezone=True))

    api_source = relationship("APISource")