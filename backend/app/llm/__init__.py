"""LLM extraction orchestrator with provider fallback, chunking, and retry handling."""
import asyncio
import json
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional

import httpx
from loguru import logger
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential_jitter,
    retry_if_exception_type,
)

from app.config import settings


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class ExtractionResult:
    success: bool = True
    data: dict = field(default_factory=dict)
    confidence: float = 0.0
    provider: Optional[str] = None
    error: Optional[str] = None


class LLMProvider(ABC):
    def __init__(self, name: str, api_key: str, api_base: str, model: str):
        self.name = name
        self.api_key = api_key
        self.api_base = api_base
        self.model = model
        self.healthy = True
        self.last_failure: float = 0
        self.consecutive_failures = 0
        self.max_consecutive_failures = 3

    @abstractmethod
    async def extract_structured(self, content: str, schema: Any) -> ExtractionResult:
        """Extract structured data from content using the provider."""

    def mark_failure(self) -> None:
        self.consecutive_failures += 1
        self.last_failure = time.time()
        if self.consecutive_failures >= self.max_consecutive_failures:
            self.healthy = False
        logger.warning(f"{self.name}: failure {self.consecutive_failures}/{self.max_consecutive_failures}")

    def mark_success(self) -> None:
        self.consecutive_failures = 0
        self.healthy = True

    async def health_check(self) -> bool:
        return bool(self.api_key) and self.healthy


class GeminiProvider(LLMProvider):
    def __init__(self, api_key: str = "", api_base: str = "", model: str = "gemini-1.5-flash"):
        super().__init__("gemini", api_key, api_base or settings.gemini_api_base, model)

    @retry(
        wait=wait_exponential_jitter(initial=2, max=30, jitter=2),
        stop=stop_after_attempt(2),
        retry=retry_if_exception_type((httpx.HTTPStatusError, httpx.RequestError, asyncio.TimeoutError)),
    )
    async def _make_request(self, payload: dict) -> dict:
        url = f"{self.api_base}/models/{self.model}:generateContent?key={self.api_key}"
        async with httpx.AsyncClient(timeout=settings.llm_provider_timeout) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 429:
                retry_after = int(resp.headers.get("Retry-After", "30"))
                import asyncio
                await asyncio.sleep(min(retry_after, 60))
                raise httpx.HTTPStatusError("Rate limited", request=resp.request, response=resp)
            resp.raise_for_status()
            return resp.json()

    async def extract_structured(self, content: str, schema: Any) -> ExtractionResult:
        if not self.api_key:
            return ExtractionResult(success=False, error="Gemini API key not configured", provider=self.name)
        payload = {
            "contents": [{"parts": [{"text": content}]}],
            "generationConfig": {
                "temperature": settings.llm_temperature,
                "maxOutputTokens": settings.llm_max_tokens,
                "responseMimeType": "application/json",
            },
        }
        data = await self._make_request(payload)
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        parsed = json.loads(text)
        return ExtractionResult(
            success=True,
            data=parsed,
            confidence=float(parsed.get("confidence") or 0.9),
            provider=self.name,
        )


class GroqProvider(LLMProvider):
    def __init__(self, api_key: str = "", api_base: str = "", model: str = "llama-3.1-70b-versatile"):
        super().__init__("groq", api_key, api_base or settings.groq_api_base, model)

    @retry(
        wait=wait_exponential_jitter(initial=2, max=30, jitter=2),
        stop=stop_after_attempt(2),
        retry=retry_if_exception_type((httpx.HTTPStatusError, httpx.RequestError, asyncio.TimeoutError)),
    )
    async def _make_request(self, payload: dict) -> dict:
        async with httpx.AsyncClient(timeout=settings.llm_provider_timeout) as client:
            resp = await client.post(
                f"{self.api_base}/chat/completions",
                json=payload,
                headers={"Authorization": f"Bearer {self.api_key}"},
            )
            if resp.status_code == 429:
                retry_after = int(resp.headers.get("Retry-After", "30"))
                import asyncio
                await asyncio.sleep(min(retry_after, 60))
                raise httpx.HTTPStatusError("Rate limited", request=resp.request, response=resp)
            resp.raise_for_status()
            return resp.json()

    async def extract_structured(self, content: str, schema: Any) -> ExtractionResult:
        if not self.api_key:
            return ExtractionResult(success=False, error="Groq API key not configured", provider=self.name)
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": "You are a precise extraction engine. Output only valid JSON matching the schema."},
                {"role": "user", "content": content},
            ],
            "temperature": settings.llm_temperature,
            "max_tokens": settings.llm_max_tokens,
            "response_format": {"type": "json_object"},
        }
        data = await self._make_request(payload)
        text = data["choices"][0]["message"]["content"]
        parsed = json.loads(text)
        return ExtractionResult(
            success=True,
            data=parsed,
            confidence=float(parsed.get("confidence") or 0.9),
            provider=self.name,
        )


class DeepSeekProvider(LLMProvider):
    def __init__(self, api_key: str = "", api_base: str = "", model: str = "deepseek-chat"):
        super().__init__("deepseek", api_key, api_base or settings.deepseek_api_base, model)

    @retry(
        wait=wait_exponential_jitter(initial=2, max=30, jitter=2),
        stop=stop_after_attempt(2),
        retry=retry_if_exception_type((httpx.HTTPStatusError, httpx.RequestError, asyncio.TimeoutError)),
    )
    async def _make_request(self, payload: dict) -> dict:
        async with httpx.AsyncClient(timeout=settings.llm_provider_timeout) as client:
            resp = await client.post(
                f"{self.api_base}/chat/completions",
                json=payload,
                headers={"Authorization": f"Bearer {self.api_key}"},
            )
            if resp.status_code == 429:
                retry_after = int(resp.headers.get("Retry-After", "30"))
                import asyncio
                await asyncio.sleep(min(retry_after, 60))
                raise httpx.HTTPStatusError("Rate limited", request=resp.request, response=resp)
            resp.raise_for_status()
            return resp.json()

    async def extract_structured(self, content: str, schema: Any) -> ExtractionResult:
        if not self.api_key:
            return ExtractionResult(success=False, error="DeepSeek API key not configured", provider=self.name)
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": "You are a precise extraction engine. Output only valid JSON matching the schema."},
                {"role": "user", "content": content},
            ],
            "temperature": settings.llm_temperature,
            "max_tokens": settings.llm_max_tokens,
            "response_format": {"type": "json_object"},
        }
        data = await self._make_request(payload)
        text = data["choices"][0]["message"]["content"]
        parsed = json.loads(text)
        return ExtractionResult(
            success=True,
            data=parsed,
            confidence=float(parsed.get("confidence") or 0.9),
            provider=self.name,
        )


class LLMOrchestrator:
    """Coordinates LLM providers with fallback chain and degraded mode."""

    def __init__(
        self,
        gemini_key: Optional[str] = None,
        groq_key: Optional[str] = None,
        deepseek_key: Optional[str] = None,
    ):
        providers: list[LLMProvider] = []
        if gemini_key:
            providers.append(GeminiProvider(api_key=gemini_key))
        if groq_key:
            providers.append(GroqProvider(api_key=groq_key))
        if deepseek_key:
            providers.append(DeepSeekProvider(api_key=deepseek_key))
        self.providers = providers
        self.degraded_mode = len(providers) == 0

    def estimate_tokens(self, text: str) -> int:
        return len(text) // 4

    def chunk_content(self, content: str, max_chars: int = 4000) -> list[str]:
        if len(content) <= max_chars:
            return [content]
        return [content[i:i + max_chars] for i in range(0, len(content), max_chars)]

    async def extract_with_fallback(self, content: str, schema: Any) -> ExtractionResult:
        if not self.providers:
            return ExtractionResult(success=False, error="No LLM providers available", provider=None)
        last_error: Optional[str] = None
        for provider in self.providers:
            if not provider.healthy:
                continue
            try:
                result = await provider.extract_structured(content, schema)
                if result.success:
                    provider.mark_success()
                    return ExtractionResult(
                        success=True,
                        data=result.data,
                        confidence=result.confidence,
                        provider=provider.name,
                        error=None,
                    )
                provider.mark_failure()
                last_error = result.error or "extraction returned no data"
            except Exception as e:
                provider.mark_failure()
                last_error = str(e)
        return ExtractionResult(success=False, error=f"All providers failed: {last_error}", provider=None)

    async def extract_chunked(self, content: str, schema: Any) -> ExtractionResult:
        chunks = self.chunk_content(content)
        results = []
        for chunk in chunks:
            res = await self.extract_with_fallback(chunk, schema)
            if res.success:
                results.append(res)
        if not results:
            return ExtractionResult(success=False, error="All providers failed on all chunks")
        merged: dict = {}
        for r in results:
            for k, v in (r.data or {}).items():
                if k not in merged or merged[k] is None:
                    merged[k] = v
        return ExtractionResult(success=True, data=merged, provider="multi-chunk")

    async def health_check(self) -> dict:
        health: dict = {}
        all_ok = True
        for p in self.providers:
            ok = await p.health_check()
            health[p.name] = ok
            if not ok:
                all_ok = False
        health["degraded_mode"] = len(self.providers) == 0
        return health

    async def extract(self, record_type: str, content: str, schema: Any) -> dict:
        result = await self.extract_with_fallback(content, schema)
        if result.success:
            return {
                "extraction_status": "COMPLETED" if result.data else "PARTIALLY_COMPLETED",
                "error": None,
                "provider_used": result.provider,
                "extracted_data": result.data or {},
            }
        return {
            "extraction_status": "FAILED",
            "error": result.error,
            "provider_used": None,
            "extracted_data": None,
        }


llm_extractor = LLMOrchestrator()
