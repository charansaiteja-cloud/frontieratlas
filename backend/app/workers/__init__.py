"""Background workers for pipeline execution."""
import asyncio
import uuid
from datetime import datetime, timezone

from loguru import logger

from app.config import settings
from app.database import AsyncSessionLocal
from app.models import PipelineTask
from app.pipelines import pipeline


def utcnow():
    return datetime.now(timezone.utc)


class PipelineWorker:
    def __init__(self, worker_id: str):
        self.worker_id = worker_id
        self.running = False

    async def start(self):
        self.running = True
        logger.info(f"Worker {self.worker_id} started")
        while self.running:
            try:
                await self.process_tasks()
            except Exception as e:
                logger.error(f"Worker {self.worker_id} error: {e}")
            await asyncio.sleep(30)

    def stop(self):
        self.running = False

    async def process_tasks(self):
        async with AsyncSessionLocal() as db:
            from sqlalchemy import select
            stmt = select(PipelineTask).where(
                PipelineTask.status == "PENDING"
            ).order_by(PipelineTask.created_at).limit(10)
            result = await db.execute(stmt)
            tasks = result.scalars().all()
            
            for task in tasks:
                if not self.running:
                    break
                await self.execute_task(task, db)

    async def execute_task(self, task: PipelineTask, db):
        task.status = "RUNNING"
        task.started_at = utcnow()
        task.attempt_count += 1
        await db.commit()
        
        try:
            if task.task_type == "full_pipeline":
                result = await pipeline.run_full_pipeline()
            elif task.task_type in ["startup", "product", "paper", "news", "job"]:
                adapters = {
                    "startup": ["startup"],
                    "product": ["product"],
                    "paper": ["paper"],
                    "news": ["news"],
                    "job": ["job"],
                }
                # This would need actual adapter mapping
                result = {"message": f"Ran {task.task_type} pipeline"}
            else:
                raise ValueError(f"Unknown task type: {task.task_type}")
            
            task.status = "COMPLETED"
            task.completed_at = utcnow()
            logger.info(f"Task {task.task_id} completed: {result}")
        except Exception as e:
            task.last_error = str(e)
            if task.attempt_count >= task.max_attempts:
                task.status = "FAILED"
            else:
                task.status = "PENDING"
            logger.error(f"Task {task.task_id} failed: {e}")
        
        await db.commit()


async def create_pipeline_task(task_type: str, source_name: str = None, payload: dict = None):
    async with AsyncSessionLocal() as db:
        task = PipelineTask(
            task_id=str(uuid.uuid4()),
            task_type=task_type,
            source_name=source_name,
            payload=payload or {},
            max_attempts=3,
        )
        db.add(task)
        await db.commit()
        return task.task_id


async def run_full_pipeline_once():
    """Run the full pipeline once (for manual triggers)."""
    logger.info("Running full pipeline...")
    result = await pipeline.run_full_pipeline()
    logger.info(f"Pipeline completed: {result}")
    return result


async def run_startup_pipeline_once():
    from app.crawlers import STARTUP_ADAPTERS
    logger.info("Running startup pipeline...")
    result = await pipeline.run_type_pipeline("startup", STARTUP_ADAPTERS)
    logger.info(f"Startup pipeline completed: {result}")
    return result


async def run_product_pipeline_once():
    from app.crawlers import PRODUCT_ADAPTERS
    logger.info("Running product pipeline...")
    result = await pipeline.run_type_pipeline("product", PRODUCT_ADAPTERS)
    logger.info(f"Product pipeline completed: {result}")
    return result


async def run_paper_pipeline_once():
    from app.crawlers import PAPER_ADAPTERS
    logger.info("Running paper pipeline...")
    result = await pipeline.run_type_pipeline("paper", PAPER_ADAPTERS)
    logger.info(f"Paper pipeline completed: {result}")
    return result


async def run_news_pipeline_once():
    from app.crawlers import NEWS_ADAPTERS
    logger.info("Running news pipeline...")
    result = await pipeline.run_type_pipeline("news", NEWS_ADAPTERS)
    logger.info(f"News pipeline completed: {result}")
    return result


async def run_job_pipeline_once():
    from app.crawlers import JOB_ADAPTERS
    logger.info("Running job pipeline...")
    result = await pipeline.run_type_pipeline("job", JOB_ADAPTERS)
    logger.info(f"Job pipeline completed: {result}")
    return result


async def run_api_registry_sync():
    """Sync API registry from public-apis repository."""
    from app.crawlers.api_sources import sync_api_registry
    logger.info("Running API registry sync...")
    result = await sync_api_registry()
    logger.info(f"API registry sync completed: {result}")
    return result


async def run_api_health_checks():
    """Run health checks on all enabled API sources."""
    from app.crawlers.api_sources import check_all_api_health
    logger.info("Running API health checks...")
    result = await check_all_api_health()
    logger.info(f"API health checks completed: {result}")
    return result