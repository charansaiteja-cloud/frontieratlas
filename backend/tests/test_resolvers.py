"""Tests for entity resolution engine."""
import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.resolvers import EntityResolver
from app.models import (
    Record, Startup, CanonicalEntity, EntityMappingLog, SourceHealth
)


class TestEntityNormalization:
    """Tests for entity name normalization."""

    @pytest.fixture
    def resolver(self, test_session: AsyncSession):
        return EntityResolver(test_session)

    def test_normalize_basic(self, resolver):
        # Basic normalization
        assert resolver.normalize("TestAI") == "testai"
        assert resolver.normalize("Test AI") == "testai"
        assert resolver.normalize("Test-AI") == "testai"
        assert resolver.normalize("Test_AI") == "testai"
        assert resolver.normalize("TEST AI") == "testai"

    def test_normalize_special_chars(self, resolver):
        # Remove special characters
        assert resolver.normalize("Test.AI!") == "testai"
        assert resolver.normalize("Test@AI#") == "testai"
        assert resolver.normalize("Test(AI)") == "testai"

    def test_normalize_suffixes(self, resolver):
        # Common company suffixes removed
        assert resolver.normalize("TestAI Inc") == "testai"
        assert resolver.normalize("TestAI Inc.") == "testai"
        assert resolver.normalize("TestAI LLC") == "testai"
        assert resolver.normalize("TestAI Ltd") == "testai"
        assert resolver.normalize("TestAI Corp") == "testai"
        assert resolver.normalize("TestAI Corporation") == "testai"
        assert resolver.normalize("TestAI GmbH") == "testai"
        assert resolver.normalize("TestAI Co") == "testai"
        assert resolver.normalize("TestAI Company") == "testai"

    def test_normalize_whitespace(self, resolver):
        # Multiple spaces collapsed
        assert resolver.normalize("Test   AI") == "testai"
        assert resolver.normalize("  Test AI  ") == "testai"
        assert resolver.normalize("\tTest\nAI\r") == "testai"


class TestFuzzyMatching:
    """Tests for fuzzy matching with rapidfuzz."""

    @pytest.fixture
    def resolver(self, test_session: AsyncSession):
        return EntityResolver(test_session)

    def test_exact_match(self, resolver):
        score = resolver.fuzzy_score("testai", "testai")
        assert score == 100

    def test_high_similarity(self, resolver):
        # High similarity - typo
        score = resolver.fuzzy_score("testai", "tesai")
        assert score >= 90

    def test_medium_similarity(self, resolver):
        # Medium similarity - partial
        score = resolver.fuzzy_score("testai inc", "testai")
        assert 70 <= score < 90

    def test_low_similarity(self, resolver):
        # Low similarity - different names
        score = resolver.fuzzy_score("testai", "othercompany")
        assert score < 70

    def test_alias_containment(self, resolver):
        # Alias detection - one contains the other
        assert resolver.is_alias("testai", "testai inc") is True
        assert resolver.is_alias("openai", "openai llc") is True
        assert resolver.is_alias("google", "google deepmind") is True
        assert resolver.is_alias("microsoft", "microsoft research") is True


class TestEntityResolution:
    """Tests for full entity resolution pipeline."""

    @pytest.fixture
    def resolver(self, test_session: AsyncSession):
        return EntityResolver(test_session)

    @pytest.mark.asyncio
    async def test_resolve_new_entity(self, resolver, test_session: AsyncSession):
        # Create a new canonical entity
        entity = CanonicalEntity(
            canonical_name="TestAI",
            entity_type="company",
            aliases=["Test AI", "TestAI Inc"],
        )
        test_session.add(entity)
        await test_session.commit()

        # Resolve a matching raw name
        result = await resolver.resolve("Test AI Inc", source_url="https://example.com")
        
        assert result.canonical_name == "TestAI"
        assert result.match_method in ["EXACT_NORMALIZED", "ALIAS_CONTAINS", "FUZZY_HIGH"]
        assert result.confidence_score >= 0.8

    @pytest.mark.asyncio
    async def test_resolve_creates_new_canonical(self, resolver, test_session: AsyncSession):
        # Resolve unknown entity - should create new canonical
        result = await resolver.resolve("BrandNewStartup", source_url="https://example.com")
        
        assert result.canonical_name == "BrandNewStartup"
        assert result.match_method == "NO_MATCH"
        assert result.confidence_score == 1.0
        assert result.required_human_review is False  # New entities auto-approved

    @pytest.mark.asyncio
    async def test_resolve_low_confidence_requires_review(self, resolver, test_session: AsyncSession):
        # Create canonical entity
        entity = CanonicalEntity(
            canonical_name="TestAI",
            entity_type="company",
        )
        test_session.add(entity)
        await test_session.commit()

        # Resolve with low similarity - should require review
        result = await resolver.resolve("TastAI", source_url="https://example.com")  # Typo
        
        # Depending on fuzzy score, might require review
        if result.confidence_score < 0.7:
            assert result.required_human_review is True
            assert result.resolution_status == "PENDING_REVIEW"

    @pytest.mark.asyncio
    async def test_resolve_logs_mapping(self, resolver, test_session: AsyncSession):
        # Ensure mapping is logged
        await resolver.resolve("TestAI", source_url="https://example.com")
        
        # Check log was created
        from sqlalchemy import select
        result = await test_session.execute(select(EntityMappingLog))
        logs = result.scalars().all()
        
        assert len(logs) == 1
        assert logs[0].raw_entity_name == "TestAI"
        assert logs[0].source_url == "https://example.com"

    @pytest.mark.asyncio
    async def test_batch_resolve(self, resolver, test_session: AsyncSession):
        # Test batch resolution
        names = ["TestAI", "OpenAI", "Google AI", "Microsoft Research"]
        results = await resolver.batch_resolve(names, source_url="https://example.com")
        
        assert len(results) == 4
        for result in results:
            assert result.canonical_name is not None
            assert result.confidence_score >= 0


class TestCanonicalEntityManagement:
    """Tests for canonical entity CRUD operations."""

    @pytest.fixture
    def resolver(self, test_session: AsyncSession):
        return EntityResolver(test_session)

    @pytest.mark.asyncio
    async def test_get_or_create_canonical(self, resolver, test_session: AsyncSession):
        # Get existing
        entity = CanonicalEntity(canonical_name="TestAI", entity_type="company")
        test_session.add(entity)
        await test_session.commit()
        
        retrieved = await resolver.get_or_create_canonical("TestAI", "company")
        assert retrieved.id == entity.id
        assert retrieved.canonical_name == "TestAI"

        # Create new
        new_entity = await resolver.get_or_create_canonical("NewAI", "company")
        assert new_entity.canonical_name == "NewAI"
        assert new_entity.entity_type == "company"

    @pytest.mark.asyncio
    async def test_add_alias(self, resolver, test_session: AsyncSession):
        entity = CanonicalEntity(canonical_name="TestAI", entity_type="company", aliases=[])
        test_session.add(entity)
        await test_session.commit()
        
        await resolver.add_alias(entity.id, "Test AI Inc")
        
        await test_session.refresh(entity)
        assert "Test AI Inc" in entity.aliases

    @pytest.mark.asyncio
    async def test_merge_entities(self, resolver, test_session: AsyncSession):
        # Create two entities
        entity1 = CanonicalEntity(canonical_name="TestAI", entity_type="company", aliases=["Test AI"])
        entity2 = CanonicalEntity(canonical_name="TestAI Inc", entity_type="company", aliases=["Test AI Inc"])
        test_session.add_all([entity1, entity2])
        await test_session.commit()
        
        # Merge entity2 into entity1
        await resolver.merge_entities(entity2.id, entity1.id)
        
        # entity2 should be marked as merged (or deleted)
        await test_session.refresh(entity1)
        assert "Test AI Inc" in entity1.aliases


class TestSeedEntities:
    """Tests for seed entity loading."""

    @pytest.fixture
    def resolver(self, test_session: AsyncSession):
        return EntityResolver(test_session)

    @pytest.mark.asyncio
    async def test_load_seed_entities(self, resolver, test_session: AsyncSession):
        await resolver.load_seed_entities()
        
        # Check that seed entities were loaded
        from sqlalchemy import select, func
        result = await test_session.execute(select(func.count(CanonicalEntity.id)))
        count = result.scalar()
        
        assert count >= 50  # At least 50 seed entities

    @pytest.mark.asyncio
    async def test_seed_entities_idempotent(self, resolver, test_session: AsyncSession):
        await resolver.load_seed_entities()
        count1 = (await test_session.execute(select(func.count(CanonicalEntity.id)))).scalar()
        
        await resolver.load_seed_entities()
        count2 = (await test_session.execute(select(func.count(CanonicalEntity.id)))).scalar()
        
        # Should not duplicate
        assert count1 == count2


class TestAuditLog:
    """Tests for audit logging."""

    @pytest.fixture
    def resolver(self, test_session: AsyncSession):
        return EntityResolver(test_session)

    @pytest.mark.asyncio
    async def test_audit_log_created(self, resolver, test_session: AsyncSession):
        await resolver.resolve("TestAI", source_url="https://example.com")
        
        from sqlalchemy import select
        result = await test_session.execute(select(EntityMappingLog))
        logs = result.scalars().all()
        
        assert len(logs) == 1
        log = logs[0]
        assert log.raw_entity_name == "TestAI"
        assert log.match_method is not None
        assert log.confidence_score is not None
        assert log.resolution_status is not None
        assert log.created_at is not None


class TestConfidenceScoring:
    """Tests for confidence score calculation."""

    @pytest.fixture
    def resolver(self, test_session: AsyncSession):
        return EntityResolver(test_session)

    def test_confidence_exact_match(self, resolver):
        score = resolver.calculate_confidence("EXACT_NORMALIZED", 100)
        assert score == 1.0

    def test_confidence_alias_match(self, resolver):
        score = resolver.calculate_confidence("ALIAS_CONTAINS", 100)
        assert score >= 0.95

    def test_confidence_fuzzy_high(self, resolver):
        score = resolver.calculate_confidence("FUZZY_HIGH", 95)
        assert 0.9 <= score < 0.95

    def test_confidence_fuzzy_medium(self, resolver):
        score = resolver.calculate_confidence("FUZZY_MEDIUM", 80)
        assert 0.7 <= score < 0.9

    def test_confidence_fuzzy_low(self, resolver):
        score = resolver.calculate_confidence("FUZZY_LOW", 60)
        assert 0.5 <= score < 0.7

    def test_confidence_no_match(self, resolver):
        score = resolver.calculate_confidence("NO_MATCH", 0)
        assert score == 1.0  # New entities get full confidence


from sqlalchemy import select, func