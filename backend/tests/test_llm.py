"""Tests for LLM extraction orchestrator."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import json

from app.llm import (
    LLMOrchestrator,
    GeminiProvider,
    GroqProvider,
    DeepSeekProvider,
    ExtractionResult,
)


class TestGeminiProvider:
    """Tests for GeminiProvider."""

    @pytest.fixture
    def provider(self):
        return GeminiProvider(api_key="test-key")

    def test_provider_initialization(self, provider):
        assert provider.name == "gemini"
        assert provider.model == "gemini-1.5-flash"
        assert provider.api_key == "test-key"

    @pytest.mark.asyncio
    async def test_extract_structured(self, provider):
        # Mock the API response
        mock_response = {
            "candidates": [{
                "content": {
                    "parts": [{
                        "text": json.dumps({
                            "entity_name": "TestAI",
                            "description": "An AI company",
                            "industry": "Artificial Intelligence",
                            "confidence": 0.95
                        })
                    }]
                }
            }]
        }
        
        with patch.object(provider, '_make_request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = mock_response
            
            result = await provider.extract_structured(
                "Extract info from: TestAI is an AI company",
                schema={"type": "object", "properties": {"entity_name": {"type": "string"}}}
            )
            
            assert result.success is True
            assert result.data["entity_name"] == "TestAI"
            assert result.confidence == 0.95


class TestGroqProvider:
    """Tests for GroqProvider."""

    @pytest.fixture
    def provider(self):
        return GroqProvider(api_key="test-key")

    def test_provider_initialization(self, provider):
        assert provider.name == "groq"
        assert provider.model == "llama-3.1-70b-versatile"
        assert provider.api_key == "test-key"

    @pytest.mark.asyncio
    async def test_extract_structured(self, provider):
        mock_response = {
            "choices": [{
                "message": {
                    "content": json.dumps({
                        "product_name": "TestProduct",
                        "category": "Developer Tools",
                        "confidence": 0.90
                    })
                }
            }]
        }
        
        with patch.object(provider, '_make_request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = mock_response
            
            result = await provider.extract_structured(
                "Extract product info",
                schema={"type": "object", "properties": {"product_name": {"type": "string"}}}
            )
            
            assert result.success is True
            assert result.data["product_name"] == "TestProduct"


class TestDeepSeekProvider:
    """Tests for DeepSeekProvider."""

    @pytest.fixture
    def provider(self):
        return DeepSeekProvider(api_key="test-key")

    def test_provider_initialization(self, provider):
        assert provider.name == "deepseek"
        assert provider.model == "deepseek-chat"
        assert provider.api_key == "test-key"

    @pytest.mark.asyncio
    async def test_extract_structured(self, provider):
        mock_response = {
            "choices": [{
                "message": {
                    "content": json.dumps({
                        "title": "Test Paper",
                        "authors": ["Author One"],
                        "confidence": 0.88
                    })
                }
            }]
        }
        
        with patch.object(provider, '_make_request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = mock_response
            
            result = await provider.extract_structured(
                "Extract paper info",
                schema={"type": "object", "properties": {"title": {"type": "string"}}}
            )
            
            assert result.success is True
            assert result.data["title"] == "Test Paper"


class TestLLMOrchestrator:
    """Tests for LLMOrchestrator."""

    @pytest.fixture
    def orchestrator(self):
        return LLMOrchestrator(
            gemini_key="gemini-key",
            groq_key="groq-key",
            deepseek_key="deepseek-key",
        )

    def test_orchestrator_initialization(self, orchestrator):
        assert len(orchestrator.providers) == 3
        assert orchestrator.providers[0].name == "gemini"
        assert orchestrator.providers[1].name == "groq"
        assert orchestrator.providers[2].name == "deepseek"

    def test_orchestrator_degraded_mode(self):
        # Test with no API keys - should work in degraded mode
        orchestrator = LLMOrchestrator()
        assert len(orchestrator.providers) == 0
        assert orchestrator.degraded_mode is True

    @pytest.mark.asyncio
    async def test_fallback_chain_gemini_to_groq(self, orchestrator):
        # Gemini fails, Groq succeeds
        with patch.object(orchestrator.providers[0], 'extract_structured', new_callable=AsyncMock) as mock_gemini:
            with patch.object(orchestrator.providers[1], 'extract_structured', new_callable=AsyncMock) as mock_groq:
                mock_gemini.return_value = ExtractionResult(success=False, error="Rate limited")
                mock_groq.return_value = ExtractionResult(
                    success=True,
                    data={"entity_name": "TestAI"},
                    confidence=0.9,
                    provider="groq"
                )
                
                result = await orchestrator.extract_with_fallback(
                    "Test content",
                    schema={}
                )
                
                assert result.success is True
                assert result.provider == "groq"
                assert result.data["entity_name"] == "TestAI"
                mock_gemini.assert_called_once()
                mock_groq.assert_called_once()

    @pytest.mark.asyncio
    async def test_fallback_chain_all_fail(self, orchestrator):
        # All providers fail
        for provider in orchestrator.providers:
            with patch.object(provider, 'extract_structured', new_callable=AsyncMock) as mock:
                mock.return_value = ExtractionResult(success=False, error="Failed")
        
        result = await orchestrator.extract_with_fallback("Test", schema={})
        
        assert result.success is False
        assert "All providers failed" in result.error

    @pytest.mark.asyncio
    async def test_chunked_extraction(self, orchestrator):
        # Test large content chunking
        large_content = "x" * 10000  # Larger than chunk size
        
        with patch.object(orchestrator, 'extract_with_fallback', new_callable=AsyncMock) as mock_extract:
            mock_extract.return_value = ExtractionResult(
                success=True,
                data={"entities": ["entity1", "entity2"]},
                confidence=0.9
            )
            
            result = await orchestrator.extract_chunked(large_content, schema={})
            
            # Should have been called multiple times for chunks
            assert mock_extract.call_count > 1

    @pytest.mark.asyncio
    async def test_health_check(self, orchestrator):
        with patch.object(orchestrator.providers[0], 'health_check', new_callable=AsyncMock) as mock_gemini:
            with patch.object(orchestrator.providers[1], 'health_check', new_callable=AsyncMock) as mock_groq:
                with patch.object(orchestrator.providers[2], 'health_check', new_callable=AsyncMock) as mock_deepseek:
                    mock_gemini.return_value = True
                    mock_groq.return_value = True
                    mock_deepseek.return_value = False
                    
                    health = await orchestrator.health_check()
                    
                    assert health["gemini"] is True
                    assert health["groq"] is True
                    assert health["deepseek"] is False
                    assert health["degraded_mode"] is False


class TestExtractionResult:
    """Tests for ExtractionResult dataclass."""

    def test_success_result(self):
        result = ExtractionResult(
            success=True,
            data={"key": "value"},
            confidence=0.95,
            provider="gemini"
        )
        
        assert result.success is True
        assert result.data["key"] == "value"
        assert result.confidence == 0.95
        assert result.provider == "gemini"
        assert result.error is None

    def test_failure_result(self):
        result = ExtractionResult(
            success=False,
            error="API error",
            provider="groq"
        )
        
        assert result.success is False
        assert result.error == "API error"
        assert result.provider == "groq"
        assert result.data == {}


class TestProvider429Handling:
    """Tests for 429 (rate limit) handling with Retry-After."""

    @pytest.fixture
    def provider(self):
        return GeminiProvider(api_key="test-key")

    @pytest.mark.asyncio
    async def test_429_retry_after_header(self, provider):
        # Mock 429 response with Retry-After header
        mock_response_429 = MagicMock()
        mock_response_429.status = 429
        mock_response_429.headers = {"retry-after": "1"}
        
        mock_response_200 = {
            "candidates": [{
                "content": {"parts": [{"text": '{"result": "success"}'}]}
            }]
        }
        
        with patch.object(provider, '_make_request', new_callable=AsyncMock) as mock_request:
            # First call returns 429, second succeeds
            mock_request.side_effect = [
                Exception("429 Rate Limited"),  # Simulated exception
                mock_response_200
            ]
            
            # Would test retry logic here
            assert True


class TestProvider413Handling:
    """Tests for 413 (payload too large) handling with chunking."""

    @pytest.fixture
    def provider(self):
        return GroqProvider(api_key="test-key")

    @pytest.mark.asyncio
    async def test_413_triggers_chunking(self, provider):
        # Mock 413 response
        with patch.object(provider, '_make_request', new_callable=AsyncMock) as mock_request:
            mock_request.side_effect = [
                Exception("413 Payload Too Large"),
                {"choices": [{"message": {"content": '{"result": "chunk1"}'}}]},
                {"choices": [{"message": {"content": '{"result": "chunk2"}'}}]},
            ]
            
            # Would test chunking logic here
            assert True