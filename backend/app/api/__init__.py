"""API routes for FrontierAtlas."""
import csv
import io
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Union

from fastapi import APIRouter, Depends, Query, HTTPException, Response
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import (
    Record, Startup, Product, ResearchPaper, Job, News,
    CanonicalEntity, EntityMappingLog, SourceHealth, PipelineTask
)
from app.schemas import (
    DashboardStats, 
    APISourceSchema, 
    APISourceCreate, 
    APISourceUpdate,
    APISourceBulkImport,
    SourceDiscoveryStats,
    APISourceHealthLogSchema
)
from app.pipelines import pipeline


def safe_isoformat(dt: Union[datetime, str, None]) -> str:
    """Safely convert datetime or string to ISO format string."""
    if dt is None:
        return ""
    if isinstance(dt, datetime):
        return dt.isoformat()
    if isinstance(dt, str):
        return dt
    return str(dt)


def safe_json_to_str(val, default="") -> str:
    """Safely convert JSON list/value to semicolon-separated string."""
    if val is None:
        return default
    if isinstance(val, list):
        items = []
        for item in val:
            if isinstance(item, dict):
                # Try to extract a meaningful string from dict
                if "name" in item:
                    items.append(str(item["name"]))
                elif "login" in item:
                    items.append(str(item["login"]))
                else:
                    items.append(str(item))
            else:
                items.append(str(item))
        return "; ".join(items) if items else default
    if isinstance(val, dict):
        if "name" in val:
            return str(val["name"])
        if "login" in val:
            return str(val["login"])
        return str(val)
    return str(val)


router = APIRouter()


def utcnow():
    return datetime.now(timezone.utc)


@router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": utcnow().isoformat()}


@router.get("/dashboard/stats", response_model=DashboardStats)
async def dashboard_stats(db: AsyncSession = Depends(get_db)):
    # Count records by type
    startups = await db.execute(select(func.count(Startup.id)))
    products = await db.execute(select(func.count(Product.id)))
    papers = await db.execute(select(func.count(ResearchPaper.id)))
    github_repos = await db.execute(select(func.count(ResearchPaper.id)).where(ResearchPaper.github_url.isnot(None)))
    jobs = await db.execute(select(func.count(Job.id)))
    news = await db.execute(select(func.count(News.id)))
    
    # Fresh jobs/news (24h)
    cutoff = utcnow() - timedelta(hours=24)
    fresh_jobs = await db.execute(select(func.count(Job.id)).where(Job.published_date >= cutoff))
    fresh_news = await db.execute(select(func.count(News.id)).where(News.published_at >= cutoff))
    
    # Extraction stats
    completed = await db.execute(select(func.count(Record.id)).where(Record.extraction_status == "COMPLETED"))
    failed = await db.execute(select(func.count(Record.id)).where(Record.extraction_status == "FAILED"))
    pending = await db.execute(select(func.count(Record.id)).where(Record.extraction_status == "PENDING"))
    
    completed_count = completed.scalar() or 0
    failed_count = failed.scalar() or 0
    pending_count = pending.scalar() or 0
    total_records = completed_count + failed_count + pending_count
    extraction_rate = completed_count / total_records if total_records > 0 else 0.0
    
    # Source stats
    total_sources = await db.execute(select(func.count(SourceHealth.id)))
    healthy_sources = await db.execute(select(func.count(SourceHealth.id)).where(SourceHealth.health_status == "HEALTHY"))
    
    return DashboardStats(
        total_startups=startups.scalar() or 0,
        total_products=products.scalar() or 0,
        total_papers=papers.scalar() or 0,
        total_github_repos=github_repos.scalar() or 0,
        total_jobs=jobs.scalar() or 0,
        total_news=news.scalar() or 0,
        fresh_jobs_24h=fresh_jobs.scalar() or 0,
        fresh_news_24h=fresh_news.scalar() or 0,
        successful_extractions=completed_count,
        failed_extractions=failed_count,
        pending_extractions=pending_count,
        extraction_rate=extraction_rate,
        total_sources=total_sources.scalar() or 0,
        healthy_sources=healthy_sources.scalar() or 0,
    )


# Pagination helper
def paginate(query, page: int = 1, page_size: int = 20):
    return query.offset((page - 1) * page_size).limit(page_size)


@router.get("/startups")
async def get_startups(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    industry: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(Startup).join(Record)
    if search:
        query = query.where(Startup.entity_name.ilike(f"%{search}%"))
    if industry:
        query = query.where(Startup.industry == industry)
    query = query.order_by(desc(Record.collected_at))
    
    total = await db.execute(select(func.count()).select_from(query.subquery()))
    items = await db.execute(paginate(query, page, page_size))
    
    return {
        "items": items.scalars().all(),
        "total": total.scalar() or 0,
        "page": page,
        "page_size": page_size,
    }


@router.get("/startups/{startup_id}")
async def get_startup_by_id(startup_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Startup).where(Startup.id == startup_id))
    startup = result.scalar_one_or_none()
    if not startup:
        raise HTTPException(status_code=404, detail="Startup not found")
    return startup


@router.get("/products")
async def get_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    pricing: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(Product).join(Record)
    if search:
        query = query.where(Product.product_name.ilike(f"%{search}%"))
    if pricing:
        query = query.where(Product.pricing_model == pricing)
    query = query.order_by(desc(Record.collected_at))
    
    total = await db.execute(select(func.count()).select_from(query.subquery()))
    items = await db.execute(paginate(query, page, page_size))
    
    return {
        "items": items.scalars().all(),
        "total": total.scalar() or 0,
        "page": page,
        "page_size": page_size,
    }


@router.get("/products/{product_id}")
async def get_product_by_id(product_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.get("/papers")
async def get_papers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    has_github: Optional[bool] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(ResearchPaper).join(Record)
    if search:
        query = query.where(ResearchPaper.title.ilike(f"%{search}%"))
    if has_github is not None:
        if has_github:
            query = query.where(ResearchPaper.github_url.isnot(None))
        else:
            query = query.where(ResearchPaper.github_url.is_(None))
    query = query.order_by(desc(ResearchPaper.published_date))
    
    total = await db.execute(select(func.count()).select_from(query.subquery()))
    items = await db.execute(paginate(query, page, page_size))
    
    return {
        "items": items.scalars().all(),
        "total": total.scalar() or 0,
        "page": page,
        "page_size": page_size,
    }


@router.get("/papers/{paper_id}")
async def get_paper_by_id(paper_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ResearchPaper).where(ResearchPaper.id == paper_id))
    paper = result.scalar_one_or_none()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    return paper


@router.get("/jobs")
async def get_jobs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    role_family: Optional[str] = None,
    remote: Optional[bool] = None,
    fresh_only: bool = False,
    db: AsyncSession = Depends(get_db)
):
    query = select(Job).join(Record)
    if search:
        query = query.where(Job.title.ilike(f"%{search}%"))
    if role_family:
        query = query.where(Job.role_family == role_family)
    if remote is not None:
        query = query.where(Job.is_remote == remote)
    if fresh_only:
        cutoff = utcnow() - timedelta(hours=24)
        query = query.where(Job.published_date >= cutoff)
    query = query.order_by(desc(Job.published_date))
    
    total = await db.execute(select(func.count()).select_from(query.subquery()))
    items = await db.execute(paginate(query, page, page_size))
    
    return {
        "items": items.scalars().all(),
        "total": total.scalar() or 0,
        "page": page,
        "page_size": page_size,
    }


@router.get("/jobs/{job_id}")
async def get_job_by_id(job_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/news")
async def get_news(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    source: Optional[str] = None,
    fresh_only: bool = False,
    db: AsyncSession = Depends(get_db)
):
    query = select(News).join(Record)
    if search:
        query = query.where(News.headline.ilike(f"%{search}%"))
    if source:
        query = query.where(News.source_name == source)
    if fresh_only:
        cutoff = utcnow() - timedelta(hours=24)
        query = query.where(News.published_at >= cutoff)
    query = query.order_by(desc(News.published_at))
    
    total = await db.execute(select(func.count()).select_from(query.subquery()))
    items = await db.execute(paginate(query, page, page_size))
    
    return {
        "items": items.scalars().all(),
        "total": total.scalar() or 0,
        "page": page,
        "page_size": page_size,
    }


@router.get("/news/{news_id}")
async def get_news_by_id(news_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(News).where(News.id == news_id))
    news = result.scalar_one_or_none()
    if not news:
        raise HTTPException(status_code=404, detail="News not found")
    return news


@router.get("/entities/mappings")
async def get_entity_mappings(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(EntityMappingLog)
    if status:
        query = query.where(EntityMappingLog.resolution_status == status)
    query = query.order_by(desc(EntityMappingLog.created_at))
    
    total = await db.execute(select(func.count()).select_from(query.subquery()))
    items = await db.execute(paginate(query, page, page_size))
    
    return {
        "items": items.scalars().all(),
        "total": total.scalar() or 0,
        "page": page,
        "page_size": page_size,
    }


@router.get("/pipeline/status")
async def pipeline_status(db: AsyncSession = Depends(get_db)):
    tasks = await db.execute(
        select(PipelineTask).order_by(desc(PipelineTask.created_at)).limit(100)
    )
    return {"tasks": tasks.scalars().all()}


@router.get("/pipeline/logs")
async def pipeline_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    query = select(PipelineTask).order_by(desc(PipelineTask.created_at))
    total = await db.execute(select(func.count()).select_from(query.subquery()))
    items = await db.execute(paginate(query, page, page_size))
    
    return {
        "items": items.scalars().all(),
        "total": total.scalar() or 0,
        "page": page,
        "page_size": page_size,
    }


@router.post("/pipeline/start")
async def start_pipeline(record_type: Optional[str] = None):
    if record_type:
        adapters = {
            "startup": ["startup"],
            "product": ["product"],
            "paper": ["paper"],
            "news": ["news"],
            "job": ["job"],
        }.get(record_type, [])
        # In production, this would trigger background task
        return {"message": f"Started {record_type} pipeline", "adapters": adapters}
    else:
        # In production, this would trigger background task
        return {"message": "Started full pipeline"}


@router.post("/pipeline/stop")
async def stop_pipeline():
    return {"message": "Pipeline stop requested"}


@router.post("/pipeline/retry-failed")
async def retry_failed():
    return {"message": "Retrying failed extractions"}


@router.post("/pipeline/api-sync")
async def trigger_api_sync():
    """Trigger API registry sync from public-apis."""
    from app.workers import run_api_registry_sync
    import asyncio
    asyncio.create_task(run_api_registry_sync())
    return {"message": "API registry sync triggered"}


@router.post("/pipeline/api-health-check")
async def trigger_api_health_check():
    """Trigger health checks for all API sources."""
    from app.workers import run_api_health_checks
    import asyncio
    asyncio.create_task(run_api_health_checks())
    return {"message": "API health checks triggered"}


@router.get("/sources")
async def get_sources(db: AsyncSession = Depends(get_db)):
    sources = await db.execute(select(SourceHealth).order_by(desc(SourceHealth.last_successful_crawl)))
    return {"sources": sources.scalars().all()}


@router.get("/exports/{record_type}")
async def export_data(record_type: str, db: AsyncSession = Depends(get_db)):
    """Export records as CSV with Google Sheets-compatible formatting."""
    
    # Define column mappings for each record type
    export_configs = {
        "startups": {
            "model": Startup,
            "query": select(Startup).join(Record).order_by(desc(Record.collected_at)),
            "columns": [
                ("record_id", lambda r: r.record.id if r.record else ""),
                ("source_name", lambda r: r.record.source_name if r.record else ""),
                ("source_url", lambda r: r.record.source_url if r.record else ""),
                ("collected_at", lambda r: safe_isoformat(r.record.collected_at) if r.record else ""),
                ("entity_name", lambda r: r.entity_name),
                ("description", lambda r: r.description),
                ("website", lambda r: r.website),
                ("industry", lambda r: r.industry),
                ("stage", lambda r: r.stage),
                ("founded_year", lambda r: r.founded_year),
                ("employee_count", lambda r: r.employee_count),
                ("total_funding_usd", lambda r: r.total_funding_usd),
                ("last_funding_round", lambda r: r.last_funding_round),
                ("last_funding_date", lambda r: safe_isoformat(r.last_funding_date)),
                ("investors", lambda r: safe_json_to_str(r.investors)),
                ("headquarters", lambda r: r.headquarters),
                ("tags", lambda r: safe_json_to_str(r.tags)),
                ("extraction_status", lambda r: r.record.extraction_status if r.record else ""),
            ]
        },
        "products": {
            "model": Product,
            "query": select(Product).join(Record).order_by(desc(Record.collected_at)),
            "columns": [
                ("record_id", lambda r: r.record.id if r.record else ""),
                ("source_name", lambda r: r.record.source_name if r.record else ""),
                ("source_url", lambda r: r.record.source_url if r.record else ""),
                ("collected_at", lambda r: safe_isoformat(r.record.collected_at) if r.record else ""),
                ("product_name", lambda r: r.product_name),
                ("description", lambda r: r.description),
                ("website", lambda r: r.website),
                ("pricing_model", lambda r: r.pricing_model),
                ("starting_price_usd", lambda r: r.starting_price_usd),
                ("category", lambda r: r.category),
                ("tags", lambda r: safe_json_to_str(r.tags)),
                ("key_features", lambda r: safe_json_to_str(r.key_features)),
                ("integrations", lambda r: safe_json_to_str(r.integrations)),
                ("company_name", lambda r: r.company_name),
                ("launch_date", lambda r: safe_isoformat(r.launch_date)),
                ("extraction_status", lambda r: r.record.extraction_status if r.record else ""),
            ]
        },
        "papers": {
            "model": ResearchPaper,
            "query": select(ResearchPaper).join(Record).order_by(desc(ResearchPaper.published_date)),
            "columns": [
                ("record_id", lambda r: r.record.id if r.record else ""),
                ("source_name", lambda r: r.record.source_name if r.record else ""),
                ("source_url", lambda r: r.record.source_url if r.record else ""),
                ("collected_at", lambda r: safe_isoformat(r.record.collected_at) if r.record else ""),
                ("title", lambda r: r.title),
                ("authors", lambda r: safe_json_to_str(r.authors)),
                ("abstract", lambda r: r.abstract),
                ("venue", lambda r: r.venue),
                ("published_date", lambda r: safe_isoformat(r.published_date)),
                ("doi", lambda r: r.doi),
                ("arxiv_id", lambda r: r.arxiv_id),
                ("paper_url", lambda r: r.paper_url),
                ("pdf_url", lambda r: r.pdf_url),
                ("github_url", lambda r: r.github_url),
                ("github_stars", lambda r: r.github_stars),
                ("github_forks", lambda r: r.github_forks),
                ("topics", lambda r: safe_json_to_str(r.topics)),
                ("tasks", lambda r: safe_json_to_str(r.tasks)),
                ("datasets", lambda r: safe_json_to_str(r.datasets)),
                ("extraction_status", lambda r: r.record.extraction_status if r.record else ""),
            ]
        },
        "jobs": {
            "model": Job,
            "query": select(Job).join(Record).order_by(desc(Job.published_date)),
            "columns": [
                ("record_id", lambda r: r.record.id if r.record else ""),
                ("source_name", lambda r: r.record.source_name if r.record else ""),
                ("source_url", lambda r: r.record.source_url if r.record else ""),
                ("collected_at", lambda r: safe_isoformat(r.record.collected_at) if r.record else ""),
                ("title", lambda r: r.title),
                ("company_name", lambda r: r.company_name),
                ("description", lambda r: r.description),
                ("requirements", lambda r: safe_json_to_str(r.requirements)),
                ("location", lambda r: r.location),
                ("is_remote", lambda r: r.is_remote),
                ("employment_type", lambda r: r.employment_type),
                ("experience_level", lambda r: r.experience_level),
                ("role_family", lambda r: r.role_family),
                ("salary_min_usd", lambda r: r.salary_min_usd),
                ("salary_max_usd", lambda r: r.salary_max_usd),
                ("currency", lambda r: r.currency),
                ("visa_sponsorship", lambda r: r.visa_sponsorship),
                ("published_date", lambda r: safe_isoformat(r.published_date)),
                ("application_url", lambda r: r.application_url),
                ("extraction_status", lambda r: r.record.extraction_status if r.record else ""),
            ]
        },
        "news": {
            "model": News,
            "query": select(News).join(Record).order_by(desc(News.published_at)),
            "columns": [
                ("record_id", lambda r: r.record.id if r.record else ""),
                ("source_name", lambda r: r.record.source_name if r.record else ""),
                ("source_url", lambda r: r.record.source_url if r.record else ""),
                ("collected_at", lambda r: safe_isoformat(r.record.collected_at) if r.record else ""),
                ("headline", lambda r: r.headline),
                ("summary", lambda r: r.summary),
                ("url", lambda r: r.url),
                ("author", lambda r: r.author),
                ("published_at", lambda r: safe_isoformat(r.published_at)),
                ("source_category", lambda r: r.source_category),
                ("tags", lambda r: safe_json_to_str(r.tags)),
                ("mentioned_entities", lambda r: safe_json_to_str(r.mentioned_entities)),
                ("sentiment_score", lambda r: r.sentiment_score),
                ("extraction_status", lambda r: r.record.extraction_status if r.record else ""),
            ]
        },
        "entities": {
            "model": EntityMappingLog,
            "query": select(EntityMappingLog).order_by(desc(EntityMappingLog.created_at)),
            "columns": [
                ("mapping_id", lambda r: r.id),
                ("raw_entity_name", lambda r: r.raw_entity_name),
                ("canonical_entity_name", lambda r: r.canonical_entity_name),
                ("match_method", lambda r: r.match_method),
                ("confidence_score", lambda r: r.confidence_score),
                ("resolution_status", lambda r: r.resolution_status),
                ("required_human_review", lambda r: r.required_human_review),
                ("reviewed_by", lambda r: r.reviewed_by),
                ("reviewed_at", lambda r: safe_isoformat(r.reviewed_at)),
                ("source_url", lambda r: r.source_url),
                ("created_at", lambda r: safe_isoformat(r.created_at)),
            ]
        }
    }
    
    if record_type not in export_configs:
        raise HTTPException(status_code=404, detail=f"Unknown record type: {record_type}")
    
    config = export_configs[record_type]
    # Eagerly load record relationship to avoid MissingGreenlet error (except for entities which don't have record)
    if record_type != "entities":
        query = config["query"].options(selectinload(config["model"].record))
    else:
        query = config["query"]
    result = await db.execute(query)
    items = result.scalars().all()
    
    # Generate CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([col[0] for col in config["columns"]])
    
    # Write data rows
    for item in items:
        row = [col[1](item) for col in config["columns"]]
        writer.writerow(row)
    
    # Return as streaming response
    output.seek(0)
    filename = f"frontieratlas_{record_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),  # utf-8-sig for Excel/Sheets compatibility
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/stats/ingestion-activity")
async def ingestion_activity(db: AsyncSession = Depends(get_db)):
    # Last 7 days of ingestion activity
    cutoff = utcnow() - timedelta(days=7)
    query = select(
        func.date(Record.collected_at).label("date"),
        Record.record_type,
        func.count(Record.id).label("count")
    ).where(Record.collected_at >= cutoff).group_by(
        func.date(Record.collected_at), Record.record_type
    ).order_by(func.date(Record.collected_at))
    result = await db.execute(query)
    return {"activity": [dict(r._mapping) for r in result.all()]}


@router.get("/stats/source-distribution")
async def source_distribution(db: AsyncSession = Depends(get_db)):
    query = select(
        Record.source_name,
        func.count(Record.id).label("count")
    ).group_by(Record.source_name).order_by(desc("count"))
    result = await db.execute(query)
    return {"distribution": [dict(r._mapping) for r in result.all()]}


@router.get("/stats/record-type-distribution")
async def record_type_distribution(db: AsyncSession = Depends(get_db)):
    query = select(
        Record.record_type,
        func.count(Record.id).label("count")
    ).group_by(Record.record_type)
    result = await db.execute(query)
    return {"distribution": [dict(r._mapping) for r in result.all()]}


@router.get("/stats/freshness-timeline")
async def freshness_timeline(db: AsyncSession = Depends(get_db)):
    cutoff = utcnow() - timedelta(days=7)
    query = select(
        func.date(News.published_at).label("date"),
        func.count(News.id).label("news_count")
    ).where(News.published_at >= cutoff).group_by(
        func.date(News.published_at)
    ).order_by(func.date(News.published_at))
    result = await db.execute(query)
    news_data = [dict(r._mapping) for r in result.all()]
    
    query = select(
        func.date(Job.published_date).label("date"),
        func.count(Job.id).label("job_count")
    ).where(Job.published_date >= cutoff).group_by(
        func.date(Job.published_date)
    ).order_by(func.date(Job.published_date))
    result = await db.execute(query)
    job_data = [dict(r._mapping) for r in result.all()]
    
    return {"news": news_data, "jobs": job_data}


@router.get("/stats/github-stars")
async def github_stars_distribution(db: AsyncSession = Depends(get_db)):
    query = select(ResearchPaper.github_stars).where(ResearchPaper.github_stars.isnot(None))
    result = await db.execute(query)
    stars = [r[0] for r in result.all()]
    return {"stars": stars}


@router.get("/stats/extraction-status")
async def extraction_status(db: AsyncSession = Depends(get_db)):
    query = select(
        Record.extraction_status,
        func.count(Record.id).label("count")
    ).group_by(Record.extraction_status)
    result = await db.execute(query)
    return {"status": [dict(r._mapping) for r in result.all()]}


# ============================================================
# API Discovery Registry Routes
# ============================================================

@router.get("/api-sources", response_model=list[APISourceSchema])
async def list_api_sources(
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    health_status: Optional[str] = Query(None),
    enabled: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """List API sources with filtering."""
    from app.models import APISource
    
    query = select(APISource)
    
    if category:
        query = query.where(APISource.category == category)
    if status:
        query = query.where(APISource.status == status)
    if health_status:
        query = query.where(APISource.health_status == health_status)
    if enabled is not None:
        query = query.where(APISource.enabled == enabled)
    if search:
        query = query.where(
            APISource.name.ilike(f"%{search}%") | 
            APISource.description.ilike(f"%{search}%")
        )
    
    query = query.order_by(APISource.integration_priority.desc(), APISource.name).limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/api-sources/stats", response_model=SourceDiscoveryStats)
async def api_sources_stats(db: AsyncSession = Depends(get_db)):
    """Get API source discovery statistics."""
    from app.models import APISource
    
    total = await db.execute(select(func.count(APISource.id)))
    total_count = total.scalar()
    
    by_category = await db.execute(
        select(APISource.category, func.count(APISource.id))
        .group_by(APISource.category)
    )
    
    by_status = await db.execute(
        select(APISource.status, func.count(APISource.id))
        .group_by(APISource.status)
    )
    
    by_health = await db.execute(
        select(APISource.health_status, func.count(APISource.id))
        .group_by(APISource.health_status)
    )
    
    enabled = await db.execute(
        select(func.count(APISource.id)).where(APISource.enabled == True)
    )
    
    integrated = await db.execute(
        select(func.count(APISource.id)).where(APISource.adapter_class.isnot(None))
    )
    
    return SourceDiscoveryStats(
        total_sources=total_count,
        by_category=dict(by_category.all()),
        by_status=dict(by_status.all()),
        by_health=dict(by_health.all()),
        enabled_sources=enabled.scalar() or 0,
        integrated_sources=integrated.scalar() or 0,
        sources_needing_review=total_count - (enabled.scalar() or 0),
    )


@router.get("/api-sources/{source_id}", response_model=APISourceSchema)
async def get_api_source(source_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single API source by ID."""
    from app.models import APISource
    
    result = await db.execute(
        select(APISource).where(APISource.id == source_id)
    )
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="API source not found")
    return source


@router.post("/api-sources", response_model=APISourceSchema, status_code=201)
async def create_api_source(source: APISourceCreate, db: AsyncSession = Depends(get_db)):
    """Create a new API source."""
    from app.models import APISource
    
    new_source = APISource(**source.model_dump())
    new_source.last_checked_at = utcnow()
    db.add(new_source)
    await db.commit()
    await db.refresh(new_source)
    return new_source


@router.post("/api-sources/bulk", response_model=dict)
async def bulk_import_api_sources(
    import_data: APISourceBulkImport, 
    db: AsyncSession = Depends(get_db)
):
    """Bulk import API sources (e.g., from public-apis sync)."""
    from app.models import APISource
    
    created = 0
    updated = 0
    errors = 0
    
    for source_data in import_data.sources:
        try:
            result = await db.execute(
                select(APISource).where(APISource.name == source_data.name)
            )
            existing = result.scalar_one_or_none()
            
            if existing and import_data.overwrite_existing:
                for key, value in source_data.model_dump().items():
                    setattr(existing, key, value)
                existing.last_checked_at = utcnow()
                updated += 1
            elif not existing:
                new_source = APISource(**source_data.model_dump())
                new_source.last_checked_at = utcnow()
                db.add(new_source)
                created += 1
        except Exception as e:
            errors += 1
    
    await db.commit()
    return {"created": created, "updated": updated, "errors": errors}


@router.patch("/api-sources/{source_id}", response_model=APISourceSchema)
async def update_api_source(
    source_id: str, 
    update: APISourceUpdate, 
    db: AsyncSession = Depends(get_db)
):
    """Update an API source."""
    from app.models import APISource
    
    result = await db.execute(
        select(APISource).where(APISource.id == source_id)
    )
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="API source not found")
    
    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(source, key, value)
    
    await db.commit()
    await db.refresh(source)
    return source


@router.post("/api-sources/{source_id}/enable")
async def enable_api_source(source_id: str, db: AsyncSession = Depends(get_db)):
    """Enable an API source."""
    from app.models import APISource
    
    result = await db.execute(
        select(APISource).where(APISource.id == source_id)
    )
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="API source not found")
    
    source.enabled = True
    source.status = "ACTIVE"
    await db.commit()
    return {"message": "API source enabled", "source_id": source_id}


@router.post("/api-sources/{source_id}/disable")
async def disable_api_source(source_id: str, db: AsyncSession = Depends(get_db)):
    """Disable an API source."""
    from app.models import APISource
    
    result = await db.execute(
        select(APISource).where(APISource.id == source_id)
    )
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="API source not found")
    
    source.enabled = False
    source.status = "DISABLED"
    await db.commit()
    return {"message": "API source disabled", "source_id": source_id}


@router.post("/api-sources/sync")
async def sync_api_registry():
    """Sync API metadata from public-apis repository."""
    from app.crawlers.api_sources import sync_api_registry
    return await sync_api_registry()


@router.post("/api-sources/health-check")
async def run_api_health_checks():
    """Run health checks on all enabled API sources."""
    from app.crawlers.api_sources import check_all_api_health
    return await check_all_api_health()


@router.get("/api-sources/{source_id}/health-history")
async def get_api_source_health_history(
    source_id: str,
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
):
    """Get health check history for an API source."""
    from app.models import APISource, APISourceHealthLog
    
    # Verify source exists
    result = await db.execute(
        select(APISource).where(APISource.id == source_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="API source not found")
    
    result = await db.execute(
        select(APISourceHealthLog)
        .where(APISourceHealthLog.api_source_id == source_id)
        .order_by(APISourceHealthLog.created_at.desc())
        .limit(limit)
    )
    return result.scalars().all()


@router.post("/api-sources/categories/refresh")
async def refresh_categories():
    """Get unique categories from API sources."""
    from app.models import APISource
    from app.database import AsyncSessionLocal
    
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(APISource.category, func.count(APISource.id))
            .group_by(APISource.category)
            .order_by(APISource.category)
        )
        return {"categories": [{"category": r[0], "count": r[1]} for r in result.all()]}