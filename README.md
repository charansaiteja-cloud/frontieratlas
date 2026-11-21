# FrontierAtlas

**AI Intelligence Graph** - Discover, track, and visualize the global AI ecosystem in real-time.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.12+](https://img.shields.io/badge/python-3.12+-blue.svg)](https://www.python.org/downloads/)
[![Node 20+](https://img.shields.io/badge/node-20+-green.svg)](https://nodejs.org/)
[![PostgreSQL + pgvector](https://img.shields.io/badge/postgresql-16+-blue.svg)](https://www.postgresql.org/)

## 🌍 Overview

FrontierAtlas is a complete AI intelligence platform that:

- **Discovers** AI startups, products, research papers, jobs, and news from 25+ verified sources
- **Crawls** with rate limiting, retry logic, and freshness validation (24-hour window for jobs/news)
- **Extracts** structured data using LLM fallback chain (Gemini → Groq → DeepSeek)
- **Resolves** entities with deterministic normalization + fuzzy matching + audit logging
- **Stores** in PostgreSQL with pgvector for future semantic search
- **Visualizes** in a liquid glassmorphism dashboard with real-time analytics
- **Exports** to CSV (Google Sheets compatible)

Every record has a traceable source URL - **no fabricated data**.

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Python 3.12+ (for local development)
- Node.js 20+ (for local frontend development)

### 1. Clone & Configure

```bash
cd frontieratlas
cp .env.example .env
```

Edit `.env` with your API keys:

```bash
# LLM API Keys (optional - system works in degraded mode without them)
GEMINI_API_KEY=your-gemini-key
GROQ_API_KEY=your-groq-key
DEEPSEEK_API_KEY=your-deepseek-key

# GitHub token for metrics (optional)
GITHUB_TOKEN=your-github-token
```

### 2. Start with Docker Compose

```bash
docker compose up -d --build
```

Services:
- **PostgreSQL** (port 5434) - Primary database with pgvector
- **Redis** (port 6379) - Celery task queue
- **Backend API** (port 8000) - FastAPI REST API
- **Celery Worker** - Background ingestion tasks
- **Frontend** (port 3000) - Next.js dashboard

### 3. Access the Dashboard

Open http://localhost:3000

### 4. Start the Pipeline

From the dashboard, click **Start Full Pipeline** or run:

```bash
curl http://localhost:8000/pipeline/start
```

## 📊 Data Sources

### Startups (2 sources)
- YCombinator Companies
- HuggingFace Organizations

### Products (5 sources)
- Product Hunt AI
- Futurepedia
- AI Tools Directory
- HuggingFace Spaces
- ThereIsAnAIForThat

### Papers (4 sources)
- arXiv API (AI/ML categories)
- Papers With Code
- OpenAlex
- HuggingFace Daily Papers

### News (5 sources)
- TechCrunch AI (RSS)
- VentureBeat AI (RSS)
- MIT Technology Review AI (RSS)
- The Decoder (RSS)
- HuggingFace Blog (RSS)

### Jobs (5 sources)
- Greenhouse (AI company career pages)
- Lever (AI company career pages)
- Wellfound (AngelList)
- HuggingFace Jobs
- Company Careers (direct)

**Total: 25 source adapters** with per-domain rate limiting and health tracking.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                      │
│  Dashboard │ Tables │ Entity Resolution │ Pipeline Monitor  │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP REST API
┌─────────────────────▼───────────────────────────────────────┐
│                   Backend (FastAPI)                         │
│  /startups │ /products │ /papers │ /jobs │ /news │ /exports│
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
┌───────▼──────┐ ┌────▼────┐ ┌─────▼─────┐
│  PostgreSQL  │ │  Redis  │ │   Celery  │
│  + pgvector  │ │  Queue  │ │   Worker  │
└──────────────┘ └─────────┘ └───────────┘
```

### Key Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Crawlers** | aiohttp, BeautifulSoup, lxml | Async web scraping with retry/backoff |
| **LLM Orchestrator** | Google Generative AI, Groq SDK | Structured extraction with fallback |
| **Entity Resolver** | rapidfuzz, SQLAlchemy | Deduplication with audit trail |
| **Pipeline** | Celery, Redis | Background task orchestration |
| **API** | FastAPI, SQLAlchemy 2 | Async REST endpoints |
| **Frontend** | Next.js 14, Framer Motion | Liquid glassmorphism UI |

## 🔧 Development

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt

# Run API server
uvicorn app.main:app --reload --port 8000

# Run Celery worker
celery -A app.workers worker --loglevel=info

# Run tests
pytest --cov=app --cov-report=html
```

### Frontend

```bash
cd frontend
npm install

# Run dev server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Docker Development

```bash
# Rebuild and restart
docker compose up -d --build

# View logs
docker compose logs -f backend
docker compose logs -f worker

# Run migrations
docker compose exec backend alembic upgrade head

# Shell access
docker compose exec backend bash
```

## 📁 Project Structure

```
frontieratlas/
├── backend/
│   ├── app/
│   │   ├── api/              # REST API endpoints
│   │   ├── crawlers/         # Source adapters (25 adapters)
│   │   ├── extractors/       # LLM extraction
│   │   ├── llm/              # Provider implementations
│   │   ├── models/           # SQLAlchemy models (9 tables)
│   │   ├── pipelines/        # Ingestion orchestration
│   │   ├── resolvers/        # Entity resolution
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── workers/          # Celery tasks
│   │   ├── config.py         # Settings
│   │   ├── database.py       # Async SQLAlchemy
│   │   └── main.py           # FastAPI app
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_models.py
│   │   ├── test_crawlers.py
│   │   ├── test_llm.py
│   │   ├── test_resolvers.py
│   │   └── test_api.py
│   ├── scripts/
│   │   └── init_db.sql
│   ├── Dockerfile
│   ├── Dockerfile.worker
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/
│   │   │   ├── DashboardOverview.tsx
│   │   │   ├── StartupsTable.tsx
│   │   │   ├── ProductsTable.tsx
│   │   │   ├── PapersTable.tsx
│   │   │   ├── JobsTable.tsx
│   │   │   ├── NewsTable.tsx
│   │   │   ├── EntityResolution.tsx
│   │   │   ├── SourceManagement.tsx
│   │   │   ├── PipelineMonitor.tsx
│   │   │   └── SettingsPanel.tsx
│   │   ├── lib/
│   │   │   └── api.ts
│   │   └── types/
│   │       └── index.ts
│   ├── tests/
│   ├── Dockerfile
│   ├── package.json
│   └── jest.config.js
├── docker-compose.yml
├── .env.example
└── README.md
```

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest                    # Run all tests
pytest -v                 # Verbose output
pytest --cov=app          # Coverage report
pytest tests/test_api.py  # Specific test file
```

### Frontend Tests

```bash
cd frontend
npm test                  # Run Jest tests
npm run test:watch        # Watch mode
npm run test:e2e          # Playwright E2E tests
```

### Integration Tests

```bash
# Start test environment
docker compose -f docker-compose.test.yml up -d

# Run integration suite
./scripts/run-integration-tests.sh
```

## 📤 API Endpoints

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/dashboard/stats` | Dashboard analytics |
| GET | `/startups` | List startups (paginated) |
| GET | `/products` | List products (paginated) |
| GET | `/papers` | List papers (paginated) |
| GET | `/jobs` | List jobs (paginated) |
| GET | `/news` | List news (paginated) |
| GET | `/entities/mappings` | Entity resolution logs |
| GET | `/sources` | Source health status |

### Pipeline Control

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/pipeline/status` | Current pipeline tasks |
| GET | `/pipeline/logs` | Task execution history |
| POST | `/pipeline/start` | Start ingestion pipeline |
| POST | `/pipeline/stop` | Stop running pipeline |
| POST | `/pipeline/retry-failed` | Retry failed tasks |

### Exports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/exports/startups` | Export startups CSV |
| GET | `/exports/products` | Export products CSV |
| GET | `/exports/papers` | Export papers CSV |
| GET | `/exports/jobs` | Export jobs CSV |
| GET | `/exports/news` | Export news CSV |
| GET | `/exports/entities` | Export entity mappings CSV |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stats/ingestion-activity` | 7-day ingestion timeline |
| GET | `/stats/source-distribution` | Records per source |
| GET | `/stats/record-type-distribution` | Records per type |
| GET | `/stats/freshness-timeline` | News/jobs freshness |
| GET | `/stats/github-stars` | GitHub stars distribution |
| GET | `/stats/extraction-status` | Extraction success rate |

## 🔐 Security

- **No secrets in code** - All API keys via environment variables
- **Rate limiting** - Per-domain concurrency limits
- **Input validation** - Pydantic v2 schemas
- **SQL injection prevention** - Async SQLAlchemy ORM
- **CORS** - Configured for localhost in dev, restricted in prod

## 📊 Data Model

### Core Tables

1. **Record** - Base record with source metadata
2. **Startup** - Startup entities
3. **Product** - AI products
4. **ResearchPaper** - Academic papers with GitHub metrics
5. **Job** - Job listings (24h freshness)
6. **News** - News articles (24h freshness)
7. **CanonicalEntity** - Resolved entity registry
8. **EntityMappingLog** - Resolution audit trail
9. **SourceHealth** - Source monitoring

### Entity Resolution

- **Deterministic**: Normalized name matching (case, punctuation, suffixes)
- **Alias-based**: Company name variations (Inc, LLC, etc.)
- **Fuzzy**: rapidfuzz similarity scoring
- **Audit**: Every resolution logged with confidence score

## 🎨 Frontend Features

- **Liquid Glassmorphism** - Dark theme with violet/cyan gradients
- **Framer Motion** - Smooth animations
- **Responsive** - Mobile-friendly tables
- **Real-time** - Auto-refresh every 5s (optional)
- **Export** - One-click CSV downloads
- **Entity Resolution** - Review and approve mappings
- **Pipeline Monitor** - Track ingestion tasks
- **Source Health** - Monitor adapter status

## 🚨 Degraded Mode

The system works **without LLM API keys**:

- Crawlers still fetch and store raw data
- Entity resolution uses only deterministic matching
- LLM extraction skipped (extraction_status = PENDING)
- Dashboard shows all crawled data

Add API keys to enable structured extraction.

## 📈 Performance

- **Concurrency**: 50 parallel requests, 5 per domain
- **Rate Limiting**: Token bucket with burst
- **Retry Logic**: Exponential backoff with jitter
- **Chunking**: Large payloads split for LLM (8000 chars)
- **Caching**: Redis for task queue, future: response cache

## 🛠️ Troubleshooting

### Backend won't start

```bash
# Check PostgreSQL is running
docker compose ps postgres

# View backend logs
docker compose logs backend

# Check database connection
docker compose exec backend python -c "from app.database import engine; print(engine)"
```

### Frontend shows 500 errors

```bash
# Check backend API is accessible
curl http://localhost:8000/health

# Check CORS settings in frontend/src/lib/api.ts
```

### No data in dashboard

```bash
# Start the pipeline
curl -X POST http://localhost:8000/pipeline/start

# Check worker is running
docker compose ps worker

# View worker logs
docker compose logs worker
```

### LLM extraction failing

```bash
# Check API keys are set
docker compose exec backend env | grep API_KEY

# Test LLM health
curl http://localhost:8000/llm/health
```

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📧 Contact

For questions or issues, please open an issue on GitHub.

---

Built with ❤️ using FastAPI, Next.js, and PostgreSQL.