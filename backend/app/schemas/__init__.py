"""Pydantic schemas for FrontierAtlas."""
import hashlib
import json
from datetime import datetime, timezone
from typing import Optional, List, Any
from pydantic import BaseModel, Field, field_validator
from enum import Enum


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def make_content_hash(record_type: str, source_url: str, payload: dict) -> str:
    data = json.dumps({"t": record_type, "u": source_url, "p": payload}, sort_keys=True, default=str)
    return hashlib.sha256(data.encode()).hexdigest()


class ExtractionStatus(str, Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    PARTIALLY_COMPLETED = "PARTIALLY_COMPLETED"


class PricingModel(str, Enum):
    FREE = "FREE"
    FREEMIUM = "FREEMIUM"
    PAID = "PAID"
    ENTERPRISE = "ENTERPRISE"
    UNKNOWN = "UNKNOWN"


class BaseRecord(BaseModel):
    record_type: str
    source_name: str
    source_url: str
    raw_data: dict = Field(default_factory=dict)
    content_hash: Optional[str] = None
    extraction_status: ExtractionStatus = ExtractionStatus.PENDING


class StartupSchema(BaseModel):
    entity_name: str
    description: Optional[str] = None
    website: Optional[str] = None
    employee_count: Optional[int] = None
    industry: Optional[str] = None
    headquarters: Optional[str] = None
    founding_year: Optional[int] = None


class ProductSchema(BaseModel):
    product_name: str
    product_url: Optional[str] = None
    description: Optional[str] = None
    startup_name: Optional[str] = None
    pricing_model: PricingModel = PricingModel.UNKNOWN


class ResearchPaperSchema(BaseModel):
    title: str
    authors: List[str] = Field(default_factory=list)
    abstract: Optional[str] = None
    paper_url: str
    arxiv_id: Optional[str] = None
    github_url: Optional[str] = None
    github_stars: Optional[int] = None
    github_repo_owner: Optional[str] = None
    github_repo_name: Optional[str] = None
    published_date: Optional[datetime] = None
    metrics_updated_at: Optional[datetime] = None


class JobSchema(BaseModel):
    company: str
    title: str
    job_url: str
    description: Optional[str] = None
    location: Optional[str] = None
    is_remote: Optional[bool] = None
    employment_type: Optional[str] = None
    role_family: Optional[str] = None
    published_date: Optional[datetime] = None


class NewsSchema(BaseModel):
    headline: str
    author: Optional[str] = None
    published_at: datetime
    full_text: Optional[str] = None
    article_url: str
    source_name: str


class EntityMappingSchema(BaseModel):
    raw_entity_name: str
    canonical_entity_name: str
    canonical_entity_id: Optional[str] = None
    match_method: str
    confidence_score: float
    source_url: Optional[str] = None
    required_human_review: bool = False
    resolution_status: str = "AUTO"
    match_details: Optional[dict] = None

    @property
    def canonical_name(self) -> str:
        return self.canonical_entity_name


class CanonicalEntitySchema(BaseModel):
    entity_name: str
    normalized_name: str
    entity_type: str
    website: Optional[str] = None
    description: Optional[str] = None
    industry: Optional[str] = None
    headquarters: Optional[str] = None
    founding_year: Optional[int] = None


class SourceHealthSchema(BaseModel):
    source_name: str
    source_url: Optional[str] = None
    source_type: str
    last_successful_crawl: Optional[datetime] = None
    last_crawl_status: Optional[str] = None
    records_discovered: int = 0
    failure_count: int = 0
    health_status: str = "UNKNOWN"
    blocked_reason: Optional[str] = None
    rate_limit_hit_at: Optional[datetime] = None


class PipelineTaskSchema(BaseModel):
    task_id: str
    task_type: str
    source_name: Optional[str] = None
    status: str = "PENDING"
    attempt_count: int = 0
    max_attempts: int = 3
    last_error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    payload: Optional[dict] = None


class DashboardStats(BaseModel):
    total_startups: int = 0
    total_products: int = 0
    total_papers: int = 0
    total_github_repos: int = 0
    total_jobs: int = 0
    total_news: int = 0
    fresh_jobs_24h: int = 0
    fresh_news_24h: int = 0
    successful_extractions: int = 0
    failed_extractions: int = 0
    pending_extractions: int = 0
    extraction_rate: float = 0.0
    total_sources: int = 0
    healthy_sources: int = 0


class ExportRecord(BaseModel):
    record_type: str
    source_name: str
    source_url: str
    collected_at: datetime
    raw_data: dict
    content_hash: str
    extraction_status: str


class APISourceSchema(BaseModel):
    id: Optional[str] = None
    name: str
    category: str
    subcategory: Optional[str] = None
    description: Optional[str] = None
    documentation_url: Optional[str] = None
    source_url: Optional[str] = None
    auth_type: str
    https_support: bool = True
    cors_support: str = "Unknown"
    rate_limit: Optional[str] = None
    free_tier: bool = True
    pricing_notes: Optional[str] = None
    status: str = "ACTIVE"
    enabled: bool = True
    last_checked_at: Optional[datetime] = None
    last_successful_call: Optional[datetime] = None
    consecutive_failures: int = 0
    health_status: str = "UNKNOWN"
    tags: List[str] = Field(default_factory=list)
    provenance: dict = Field(default_factory=dict)
    integration_priority: int = 0
    adapter_class: Optional[str] = None

    class Config:
        from_attributes = True


class APISourceHealthLogSchema(BaseModel):
    id: Optional[str] = None
    api_source_id: str
    status_code: Optional[int] = None
    response_time_ms: Optional[int] = None
    success: bool = False
    error_message: Optional[str] = None
    rate_limit_remaining: Optional[str] = None
    rate_limit_reset: Optional[datetime] = None

    class Config:
        from_attributes = True


class APISourceCreate(BaseModel):
    name: str
    category: str
    subcategory: Optional[str] = None
    description: Optional[str] = None
    documentation_url: Optional[str] = None
    source_url: Optional[str] = None
    auth_type: str
    https_support: bool = True
    cors_support: str = "Unknown"
    rate_limit: Optional[str] = None
    free_tier: bool = True
    pricing_notes: Optional[str] = None
    status: str = "ACTIVE"
    enabled: bool = True
    tags: List[str] = Field(default_factory=list)
    provenance: dict = Field(default_factory=dict)
    integration_priority: int = 0
    adapter_class: Optional[str] = None


class APISourceUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    description: Optional[str] = None
    documentation_url: Optional[str] = None
    source_url: Optional[str] = None
    auth_type: Optional[str] = None
    https_support: Optional[bool] = None
    cors_support: Optional[str] = None
    rate_limit: Optional[str] = None
    free_tier: Optional[bool] = None
    pricing_notes: Optional[str] = None
    status: Optional[str] = None
    enabled: Optional[bool] = None
    tags: Optional[List[str]] = None
    provenance: Optional[dict] = None
    integration_priority: Optional[int] = None
    adapter_class: Optional[str] = None


class APISourceBulkImport(BaseModel):
    sources: List[APISourceCreate]
    overwrite_existing: bool = False


class SourceDiscoveryStats(BaseModel):
    total_sources: int = 0
    by_category: dict = Field(default_factory=dict)
    by_status: dict = Field(default_factory=dict)
    by_health: dict = Field(default_factory=dict)
    enabled_sources: int = 0
    integrated_sources: int = 0
    sources_needing_review: int = 0