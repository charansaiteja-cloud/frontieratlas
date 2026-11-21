"""Entity resolution engine with normalization, fuzzy matching, and audit logging."""
import re
import unicodedata
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from difflib import SequenceMatcher
from typing import Optional

from loguru import logger
from rapidfuzz import fuzz, process

from sqlalchemy import select
from app.config import settings
from app.database import AsyncSessionLocal
from app.models import CanonicalEntity, EntityMappingLog
from app.schemas import CanonicalEntitySchema, EntityMappingSchema


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


@asynccontextmanager
async def _session_context(db=None):
    """Use injected session if present, otherwise open a new AsyncSessionLocal session."""
    if db is not None:
        yield db
        return
    async with AsyncSessionLocal() as session:
        yield session


SEED_ENTITIES = [
    {"name": "OpenAI", "type": "startup", "website": "https://openai.com", "industry": "AI Research", "headquarters": "San Francisco, CA", "founding_year": 2015},
    {"name": "Anthropic", "type": "startup", "website": "https://anthropic.com", "industry": "AI Research", "headquarters": "San Francisco, CA", "founding_year": 2021},
    {"name": "Google DeepMind", "type": "startup", "website": "https://deepmind.google", "industry": "AI Research", "headquarters": "London, UK", "founding_year": 2010},
    {"name": "Meta AI", "type": "startup", "website": "https://ai.meta.com", "industry": "AI Research", "headquarters": "Menlo Park, CA", "founding_year": 2013},
    {"name": "Microsoft Research", "type": "startup", "website": "https://www.microsoft.com/en-us/research", "industry": "AI Research", "founding_year": 1991},
    {"name": "NVIDIA", "type": "startup", "website": "https://www.nvidia.com", "industry": "AI Hardware", "headquarters": "Santa Clara, CA", "founding_year": 1993},
    {"name": "Hugging Face", "type": "startup", "website": "https://huggingface.co", "industry": "ML Platform", "headquarters": "New York, NY", "founding_year": 2016},
    {"name": "Cohere", "type": "startup", "website": "https://cohere.com", "industry": "AI Research", "headquarters": "Toronto, Canada", "founding_year": 2019},
    {"name": "Stability AI", "type": "startup", "website": "https://stability.ai", "industry": "Generative AI", "headquarters": "London, UK", "founding_year": 2020},
    {"name": "Replicate", "type": "startup", "website": "https://replicate.com", "industry": "ML Platform", "headquarters": "San Francisco, CA", "founding_year": 2019},
    {"name": "Weaviate", "type": "startup", "website": "https://weaviate.io", "industry": "Vector Database", "headquarters": "Amsterdam, Netherlands", "founding_year": 2019},
    {"name": "Pinecone", "type": "startup", "website": "https://www.pinecone.io", "industry": "Vector Database", "headquarters": "San Francisco, CA", "founding_year": 2019},
    {"name": "Chroma", "type": "startup", "website": "https://www.trychroma.com", "industry": "Vector Database", "headquarters": "San Francisco, CA", "founding_year": 2022},
    {"name": "LangChain", "type": "startup", "website": "https://www.langchain.com", "industry": "ML Framework", "headquarters": "San Francisco, CA", "founding_year": 2022},
    {"name": "LlamaIndex", "type": "startup", "website": "https://www.llamaindex.ai", "industry": "ML Framework", "headquarters": "San Francisco, CA", "founding_year": 2022},
    {"name": "Databricks", "type": "startup", "website": "https://databricks.com", "industry": "Data & AI Platform", "headquarters": "San Francisco, CA", "founding_year": 2013},
    {"name": "Snowflake", "type": "startup", "website": "https://www.snowflake.com", "industry": "Data Platform", "headquarters": "Bozeman, MT", "founding_year": 2012},
    {"name": "Scale AI", "type": "startup", "website": "https://scale.com", "industry": "Data Labeling", "headquarters": "San Francisco, CA", "founding_year": 2016},
    {"name": "Labelbox", "type": "startup", "website": "https://labelbox.com", "industry": "Data Labeling", "headquarters": "San Francisco, CA", "founding_year": 2018},
    {"name": "Weights & Biases", "type": "startup", "website": "https://wandb.ai", "industry": "MLOps", "headquarters": "San Francisco, CA", "founding_year": 2017},
    {"name": "MLflow", "type": "startup", "website": "https://mlflow.org", "industry": "MLOps", "headquarters": "San Francisco, CA", "founding_year": 2018},
    {"name": "Ray", "type": "startup", "website": "https://www.anyscale.com", "industry": "Distributed Computing", "headquarters": "San Francisco, CA", "founding_year": 2019},
    {"name": "Modular", "type": "startup", "website": "https://www.modular.com", "industry": "AI Infrastructure", "headquarters": "Los Altos, CA", "founding_year": 2022},
    {"name": "Together AI", "type": "startup", "website": "https://www.together.ai", "industry": "AI Infrastructure", "headquarters": "San Francisco, CA", "founding_year": 2022},
    {"name": "Mistral AI", "type": "startup", "website": "https://mistral.ai", "industry": "AI Research", "headquarters": "Paris, France", "founding_year": 2023},
    {"name": "Adept", "type": "startup", "website": "https://www.adept.ai", "industry": "AI Agents", "headquarters": "San Francisco, CA", "founding_year": 2022},
    {"name": "Inflection AI", "type": "startup", "website": "https://inflection.ai", "industry": "AI Research", "headquarters": "Palo Alto, CA", "founding_year": 2022},
    {"name": "Character.ai", "type": "startup", "website": "https://character.ai", "industry": "AI Chat", "headquarters": "Menlo Park, CA", "founding_year": 2021},
    {"name": "Perplexity AI", "type": "startup", "website": "https://www.perplexity.ai", "industry": "AI Search", "headquarters": "San Francisco, CA", "founding_year": 2022},
    {"name": "ElevenLabs", "type": "startup", "website": "https://elevenlabs.io", "industry": "Voice AI", "headquarters": "New York, NY", "founding_year": 2022},
    {"name": "Runway", "type": "startup", "website": "https://runwayml.com", "industry": "Generative AI", "headquarters": "New York, NY", "founding_year": 2018},
    {"name": "Synthesia", "type": "startup", "website": "https://www.synthesia.io", "industry": "Generative AI", "headquarters": "London, UK", "founding_year": 2017},
    {"name": "Descript", "type": "startup", "website": "https://www.descript.com", "industry": "Generative AI", "headquarters": "San Francisco, CA", "founding_year": 2017},
    {"name": "Jasper", "type": "startup", "website": "https://www.jasper.ai", "industry": "Generative AI", "headquarters": "Austin, TX", "founding_year": 2021},
    {"name": "Copy.ai", "type": "startup", "website": "https://www.copy.ai", "industry": "Generative AI", "headquarters": "Memphis, TN", "founding_year": 2020},
    {"name": "Notion", "type": "startup", "website": "https://www.notion.so", "industry": "Productivity", "headquarters": "San Francisco, CA", "founding_year": 2016},
    {"name": "GitHub Copilot", "type": "product", "website": "https://github.com/features/copilot", "industry": "Code Generation", "headquarters": "San Francisco, CA", "founding_year": 2021},
    {"name": "Cursor", "type": "startup", "website": "https://www.cursor.sh", "industry": "Code Generation", "headquarters": "San Francisco, CA", "founding_year": 2022},
    {"name": "Codeium", "type": "startup", "website": "https://codeium.com", "industry": "Code Generation", "headquarters": "Mountain View, CA", "founding_year": 2021},
    {"name": "Tabnine", "type": "startup", "website": "https://www.tabnine.com", "industry": "Code Generation", "headquarters": "Tel Aviv, Israel", "founding_year": 2013},
    {"name": "Replit", "type": "startup", "website": "https://replit.com", "industry": "Code Platform", "headquarters": "San Francisco, CA", "founding_year": 2016},
    {"name": "Vercel", "type": "startup", "website": "https://vercel.com", "industry": "Cloud Platform", "headquarters": "San Francisco, CA", "founding_year": 2015},
    {"name": "Netlify", "type": "startup", "website": "https://www.netlify.com", "industry": "Cloud Platform", "headquarters": "San Francisco, CA", "founding_year": 2014},
    {"name": "Supabase", "type": "startup", "website": "https://supabase.com", "industry": "Backend Platform", "headquarters": "San Francisco, CA", "founding_year": 2020},
    {"name": "PlanetScale", "type": "startup", "website": "https://planetscale.com", "industry": "Database", "headquarters": "San Francisco, CA", "founding_year": 2018},
    {"name": "Neon", "type": "startup", "website": "https://neon.tech", "industry": "Database", "headquarters": "San Francisco, CA", "founding_year": 2021},
    {"name": "Turso", "type": "startup", "website": "https://turso.tech", "industry": "Database", "headquarters": "San Francisco, CA", "founding_year": 2022},
    {"name": "Fly.io", "type": "startup", "website": "https://fly.io", "industry": "Cloud Platform", "headquarters": "Chicago, IL", "founding_year": 2017},
    {"name": "Railway", "type": "startup", "website": "https://railway.app", "industry": "Cloud Platform", "headquarters": "New York, NY", "founding_year": 2020},
    {"name": "Render", "type": "startup", "website": "https://render.com", "industry": "Cloud Platform", "headquarters": "San Francisco, CA", "founding_year": 2019},
]


class EntityResolver:
    def __init__(self, db=None):
        self.db = db
        self.exact_threshold = 0.95
        self.fuzzy_threshold = 0.85
        self.human_review_threshold = 0.70
        self.legal_suffixes = {
            "inc", "inc.", "incorporated", "corp", "corp.", "corporation",
            "llc", "l.l.c.", "ltd", "ltd.", "limited", "gmbh", "ag",
            "sa", "s.a.", "pvt", "pvt.", "private", "co", "co.", "company",
            "group", "holdings", "international", "intl", "technologies",
            "technology", "tech", "systems", "solutions", "labs", "lab",
        }

    def normalize(self, name: str) -> str:
        """Normalize entity name for matching."""
        if not name:
            return ""
        # Unicode normalization
        name = unicodedata.normalize("NFKD", name)
        # Lowercase
        name = name.lower()
        # Remove all non-alphanumeric characters (keep only a-z, 0-9)
        name = re.sub(r"[^a-z0-9]", " ", name)
        # Remove legal suffixes only at the end
        words = name.split()
        words = [w for w in words if w not in self.legal_suffixes]
        # Normalize whitespace and remove ALL spaces for matching
        name = "".join(words)
        return name

    def fuzzy_score(self, a: str, b: str) -> int:
        """Calculate fuzzy match score between two strings."""
        return fuzz.ratio(a, b)

    def is_alias(self, a: str, b: str) -> bool:
        """Check if one string is an alias of the other (containment)."""
        a_norm = self.normalize(a)
        b_norm = self.normalize(b)
        return a_norm in b_norm or b_norm in a_norm

    def exact_match(self, normalized: str) -> Optional[CanonicalEntity]:
        """Find exact normalized match in database."""
        pass  # Will be implemented with DB session

    def fuzzy_match(self, normalized: str, candidates: list[str], threshold: float = None) -> Optional[tuple[str, float]]:
        """Find best fuzzy match above threshold."""
        threshold = threshold or self.fuzzy_threshold
        if not candidates:
            return None
        result = process.extractOne(normalized, candidates, scorer=fuzz.ratio, score_cutoff=int(threshold * 100))
        if result:
            return result[0], result[1] / 100.0
        return None

    async def get_or_create_canonical(self, name: str, entity_type: str = "company") -> CanonicalEntity:
        """Get or create a canonical entity by name."""
        normalized = self.normalize(name)
        
        async with _session_context(self.db) as db:
            # Check if entity already exists (by normalized_name OR entity_name)
            stmt = select(CanonicalEntity).where(
                (CanonicalEntity.normalized_name == normalized) | 
                (CanonicalEntity.entity_name == name),
                CanonicalEntity.entity_type == entity_type
            )
            result = await db.execute(stmt)
            existing = result.scalar_one_or_none()
            
            if existing:
                return existing
            
            # Create new entity
            entity = CanonicalEntity(
                entity_name=name,
                normalized_name=normalized,
                entity_type=entity_type
            )
            db.add(entity)
            await db.commit()
            return entity
    
    async def add_alias(self, entity_id: int, alias_name: str) -> None:
        """Add an alias to an existing canonical entity."""
        result = await self.db.execute(select(CanonicalEntity).where(CanonicalEntity.id == entity_id))
        entity = result.scalars().first()
        if entity is not None:
            if alias_name not in entity.aliases:
                entity.aliases = entity.aliases + [alias_name]
            await self.db.commit()
    
    async def merge_entities(self, target_id: int, source_id: int) -> None:
        """Merge source entity into target entity."""
        target = await self.db.get(CanonicalEntity, target_id)
        source = await self.db.get(CanonicalEntity, source_id)
        if target is None or source is None:
            return
        # Update all mapping logs referencing source to reference target instead
        from app.models import EntityMappingLog
        await self.db.execute(
            EntityMappingLog.__table__.update().
            where(EntityMappingLog.canonical_entity_id == source_id).
            values(canonical_entity_id=target_id)
        )
        # Merge aliases from target to source (source gains target's aliases)
        source.aliases.extend(a for a in target.aliases if a not in source.aliases)

    async def load_seed_entities(self) -> list[CanonicalEntity]:
        """Load seed entities for initial entity graph."""
        async with _session_context(self.db) as db:
            from sqlalchemy import select, func
            
            entities = []
            for seed in SEED_ENTITIES:
                normalized = self.normalize(seed["name"])
                # Check if entity already exists (idempotency)
                stmt = select(CanonicalEntity).where(
                    CanonicalEntity.normalized_name == normalized,
                    CanonicalEntity.entity_type == seed.get("type", "startup")
                )
                result = await db.execute(stmt)
                existing = result.scalar_one_or_none()
                
                if existing:
                    entities.append(existing)
                else:
                    entity = CanonicalEntity(
                        entity_name=seed["name"],
                        normalized_name=normalized,
                        entity_type=seed.get("type", "startup"),
                        website=seed.get("website"),
                        industry=seed.get("industry"),
                        headquarters=seed.get("headquarters"),
                        founding_year=seed.get("founding_year"),
                    )
                    db.add(entity)
                    entities.append(entity)
            
            await db.commit()
            
            # Return all entities loaded
            result = await db.execute(select(CanonicalEntity))
            return result.scalars().all()

    def calculate_confidence(self, match_type: str, base_score: int = 100) -> float:
        """Calculate confidence score based on match type."""
        if base_score == 0:
            return 1.0  # New entities get full confidence
        confidence_rates = {
            "EXACT_NORMALIZED": 1.0,
            "ALIAS_CONTAINS": 1.0,
            "FUZZY_HIGH": 0.98,
            "FUZZY_MEDIUM": 0.9,
            "FUZZY_LOW": 0.85,
            "NO_MATCH": 0.0,
        }
        return confidence_rates.get(match_type, 0.0) * (base_score / 100.0)

    async def resolve(self, raw_name: str, entity_type: str = "company", source_url: str = "") -> EntityMappingSchema:
        """Resolve raw entity name to canonical entity."""
        normalized = self.normalize(raw_name)
        
        async with _session_context(self.db) as db:
            # Check exact match
            from sqlalchemy import select
            stmt = select(CanonicalEntity).where(
                CanonicalEntity.normalized_name == normalized,
                CanonicalEntity.entity_type == entity_type
            )
            result = await db.execute(stmt)
            exact = result.scalar_one_or_none()
            
            if exact:
                mapping = EntityMappingSchema(
                    raw_entity_name=raw_name,
                    canonical_entity_name=exact.entity_name,
                    canonical_entity_id=str(exact.id),
                    match_method="EXACT_NORMALIZED",
                    confidence_score=1.0,
                    source_url=source_url,
                    required_human_review=False,
                    resolution_status="AUTO",
                )
                await self._log_mapping(db, mapping)
                return mapping
            
            # Check alias match (canonical entity name contains normalized)
            stmt = select(CanonicalEntity).where(
                CanonicalEntity.entity_type == entity_type
            )
            result = await db.execute(stmt)
            all_entities = result.scalars().all()
            
            for entity in all_entities:
                if normalized in self.normalize(entity.entity_name) or self.normalize(entity.entity_name) in normalized:
                    mapping = EntityMappingSchema(
                        raw_entity_name=raw_name,
                        canonical_entity_name=entity.entity_name,
                        canonical_entity_id=str(entity.id),
                        match_method="ALIAS_CONTAINS",
                        confidence_score=0.9,
                        source_url=source_url,
                        required_human_review=False,
                        resolution_status="AUTO",
                    )
                    await self._log_mapping(db, mapping)
                    return mapping
            
            # Fuzzy match
            candidates = [e.entity_name for e in all_entities]
            fuzzy_result = self.fuzzy_match(normalized, candidates)
            
            if fuzzy_result:
                matched_name, score = fuzzy_result
                matched_entity = next(e for e in all_entities if e.entity_name == matched_name)
                
                if score >= self.exact_threshold:
                    method = "FUZZY_HIGH"
                    review = False
                elif score >= self.fuzzy_threshold:
                    method = "FUZZY_MEDIUM"
                    review = False
                elif score >= self.human_review_threshold:
                    method = "FUZZY_LOW"
                    review = True
                else:
                    method = "NO_MATCH"
                    review = True
                    matched_entity = None
                
                mapping = EntityMappingSchema(
                    raw_entity_name=raw_name,
                    canonical_entity_name=matched_entity.entity_name if matched_entity else raw_name,
                    canonical_entity_id=str(matched_entity.id) if matched_entity else None,
                    match_method=method,
                    confidence_score=score,
                    source_url=source_url,
                    required_human_review=review,
                    resolution_status="PENDING_REVIEW" if review else "AUTO",
                )
                await self._log_mapping(db, mapping)
                return mapping
            
            # No match found - new entity auto-approved
            mapping = EntityMappingSchema(
                raw_entity_name=raw_name,
                canonical_entity_name=raw_name,
                canonical_entity_id=None,
                match_method="NO_MATCH",
                confidence_score=1.0,
                source_url=source_url,
                required_human_review=False,
                resolution_status="AUTO",
            )
            await self._log_mapping(db, mapping)
            return mapping

    async def _log_mapping(self, db, mapping: EntityMappingSchema):
        from uuid import UUID
        canonical_entity_id = None
        if mapping.canonical_entity_id:
            canonical_entity_id = UUID(mapping.canonical_entity_id)
        log = EntityMappingLog(
            raw_entity_name=mapping.raw_entity_name,
            canonical_entity_name=mapping.canonical_entity_name,
            canonical_entity_id=canonical_entity_id,
            match_method=mapping.match_method,
            confidence_score=mapping.confidence_score,
            source_url=mapping.source_url,
            required_human_review=mapping.required_human_review,
            resolution_status=mapping.resolution_status,
        )
        db.add(log)
        await db.commit()

    async def batch_resolve(self, names: list[str], entity_type: str = "company", source_url: str = "") -> list[EntityMappingSchema]:
        """Batch resolve multiple entity names."""
        results = []
        for name in names:
            result = await self.resolve(name, entity_type, source_url)
            results.append(result)
        return results

    async def seed_entities(self):
        """Seed canonical entities from the predefined list."""
        async with _session_context(self.db) as db:
            from sqlalchemy import select
            for seed in SEED_ENTITIES:
                normalized = self.normalize(seed["name"])
                stmt = select(CanonicalEntity).where(
                    CanonicalEntity.normalized_name == normalized,
                    CanonicalEntity.entity_type == seed["type"]
                )
                result = await db.execute(stmt)
                existing = result.scalar_one_or_none()
                if not existing:
                    entity = CanonicalEntity(
                        entity_name=seed["name"],
                        normalized_name=normalized,
                        entity_type=seed["type"],
                        website=seed.get("website"),
                        industry=seed.get("industry"),
                        headquarters=seed.get("headquarters"),
                        founding_year=seed.get("founding_year"),
                    )
                    db.add(entity)
            await db.commit()
            logger.info(f"Seeded {len(SEED_ENTITIES)} canonical entities")


entity_resolver = EntityResolver()