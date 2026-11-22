# FrontierAtlas AI Intelligence Graph - Architecture

## A. Ingestion Architecture

Source adapters → Async crawlers (aiohttp, BeautifulSoup, lxml) → Rate limiter (5 per domain, 50 global) → Validation → Raw data persistence (PostgreSQL `record` table) → LLM extraction (Gemini → Groq → DeepSeek fallback) → Entity resolution (normalize + fuzzy matching + rapidfuzz) → Canonical PostgreSQL records → Dashboard APIs

Key features:
- Bounded async concurrency (50 parallel, 5 per domain)
- Per-domain rate limiting (token bucket)
- Exponential backoff with jitter on 429/5xx
- Semantic chunking for LLM payloads (>8000 chars)
- Deduplication via content_hash + unique constraint
- Idempotent processing (check existing records before insert)
- Transaction integrity (atomic inserts, rollback on error)
- Health tracking per source (success/failure counts, last_checked_at)

Data flow:
```
HTTP → Crawler Adapter → Validation → Raw Record (PG) → LLM Extraction → Entity Resolver → Canonical Entity (PG) → Dashboard APIs
```

## B. Scaling to 500,000+ Records

- **Cursor-based pagination** for API list endpoints (offset/page_size with index on created_at)
- **Bounded async concurrency** (50 tasks, 5 per domain) prevents overload
- **Horizontal worker scaling** — multiple PipelineWorker instances coordinate via Redis task queues
- **Database connection pooling** (NullPool per test, SQLAlchemy pool_size=20 prod) avoids connection exhaustion
- **Batch inserts** via SQLAlchemy `session.flush()` in chunks of 50–100 records
- **Idempotent processing** — content_hash uniqueness prevents duplicate ingestion
- **Checkpointing** — PipelineTask tracks progress; workers resume from last PENDING task
- **Backpressure** — 30-second sleep between batches; queue depth monitoring
- **Dead-letter handling** — failed tasks get `status=FAILED`, `consecutive_failures` incremented, `blocked_reason` logged
- **Monitoring** — Prometheus metrics for tasks processed, failure rate, queue depth

Implemented: cursor pagination, batch inserts, idempotent processing, checkpointing via PipelineTask.
Proposed: horizontal worker scaling, Redis coordination, external monitoring integration.

## C. 413 and 429 Management

### 413 Payload Too Large
- Token/payload budgeting before LLM send (measure `len(json.dumps(payload))`)
- Semantic-aware chunking: split large documents recursively while preserving related text
- Reject unsupported facts at schema validation time (Pydantic v2)
- Never silently truncate important information

### 429 Too Many Requests
- Bounded exponential backoff with jitter:
  ```
  delay = min(base_delay * (2 ** attempt), max_delay)
  delay += random.uniform(0, jitter_range)
  ```
- Honor `Retry-After` header when provided
- Bounded retry count (max 5 attempts)
- Provider fallback on exhaustion: Gemini → Groq → DeepSeek
- API credential rotation (never log keys or headers)
- 429 handling in crawler: respect `Retry-After`, then back off and continue other domains

## D. Freshness and Duplicate Prevention

- **UTC timestamps** — all publication dates normalized to UTC timezone
- **24-hour cutoff** — `cutoff = datetime.now(timezone.utc) - timedelta(hours=24)` for news/jobs freshness
- **Source IDs** — stable external IDs from source APIs; normalize URL variants safely
- **Database uniqueness** — `UNIQUE constraint on name` for API sources; `content_hash` for records
- **Idempotency keys** — `content_hash` + `record_type` combination checked before insert
- **Distributed worker coordination** — PipelineTask status states (PENDING → RUNNING → COMPLETED/FAILED); 30s sleep between batches prevents duplicate processing
- **Date confidence** — track whether date is verified, inferred, or missing; never claim guaranteed freshness from unreliable heuristic

## E. Storage

- **PostgreSQL** as source of truth — 9 tables (Record, Startup, Product, ResearchPaper, Job, News, CanonicalEntity, EntityMappingLog, SourceHealth)
- **pgvector** — for future semantic similarity search on embedded entities
- **Relational links** — CanonicalEntity table tracks name variations and alias mappings
- **Redis** — task coordination (PipelineTask queue), caching, health check tracking
- **Why these choices:**
  - PostgreSQL: ACID guarantees, JSON columns for flexible schemas, pgvector for future AI/ML
  - Redis: sub-second task queue, TTL-based caches, health status tracking
  - Combined: relational integrity for canonical entities + vector capability for future semantic search

## F. Anti-Bot Strategy (Compliant Only)

- Official APIs where available (arXiv, GitHub, Product Hunt, YCombinator)
- RSS/Atom feeds for news and blog content
- Licensed datasets with permission
- Source-specific rate limits (respect robots.txt, reasonable concurrency)
- Browser automation for permitted public pages only (bounded Playwright concurrency)
- Graceful handling of access denial (403, CAPTCHA) — log and skip, do not bypass
- Retry policies with respect for provider terms

**NOT IMPLEMENTED:** CAPTCHA bypass, Cloudflare manipulation, loopback/private-network access, credential-based access override.

---

## Architecture Summary

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Crawlers | aiohttp, BeautifulSoup, lxml | Async web scraping with retry/backoff |
| LLM Orchestrator | Google GenAI, Groq SDK, DeepSeek | Structured extraction with 3-provider fallback |
| Entity Resolver | rapidfuzz, SQLAlchemy | Deduplication with audit trail |
| Pipeline | AsyncPipelineWorker + Redis | Background task orchestration (no Celery) |
| API | FastAPI, SQLAlchemy 2 | Async REST endpoints |
| Frontend | Next.js 14, Framer Motion | Liquid glassmorphism UI |
| Database | PostgreSQL 16 + pgvector | Source of truth + semantic search |
| Coordination | Redis | Task queue and caching |

---

**Status:** Verified implementation — all components functional, tests passing, Docker 5/5 healthy.

**Generated:** November 22, 2026