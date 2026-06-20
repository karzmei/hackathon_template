"""The single LLM path: Google ADK driving Azure/Gemini/Apertus via LiteLLM.

Every model call in the pipeline goes through `run_agent`, which returns the text
plus token usage and a USD cost from the deterministic price table in `config.py`.

Priority: Azure > Google Gemini > Public AI (Apertus) > offline stub.

Offline behaviour: if no provider is configured, `run_agent` returns the caller's
`offline_response` (clearly labelled demo fallback, not a silent mock) with an
estimated token count, so the whole pipeline runs end to end without any key.
"""

from __future__ import annotations

import os
import uuid
from dataclasses import dataclass

import config

APP_NAME = "driftwatch"
USER_ID = "system"


@dataclass
class LlmResult:
    text: str
    tokens_in: int
    tokens_out: int
    usd: float
    model: str
    offline: bool


def _estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4)


def _gemini_model_for(deployment: str) -> str:
    if deployment == config.DEPLOYMENT_DEEP:
        return config.GEMINI_DEEP
    return config.GEMINI_REASONING


def _publicai_model_for(deployment: str) -> str:
    if deployment == config.DEPLOYMENT_DEEP:
        return config.PUBLICAI_DEEP
    return config.PUBLICAI_REASONING


async def _run_with_litellm(
    prompt: str,
    model: str,
    system_instruction: str,
    api_base: str | None = None,
    api_key: str | None = None,
) -> tuple[str, int, int]:
    """Run one turn via Google ADK + LiteLLM; return (text, tokens_in, tokens_out)."""
    from google.adk.agents import LlmAgent
    from google.adk.models.lite_llm import LiteLlm
    from google.adk.runners import Runner
    from google.adk.sessions import InMemorySessionService
    from google.genai import types

    litellm_kwargs: dict = {}
    if api_base:
        litellm_kwargs["api_base"] = api_base
    if api_key:
        litellm_kwargs["api_key"] = api_key

    agent = LlmAgent(
        model=LiteLlm(model=model, **litellm_kwargs),
        name="driftwatch_agent",
        instruction=system_instruction,
    )
    session_service = InMemorySessionService()
    session_id = uuid.uuid4().hex
    await session_service.create_session(
        app_name=APP_NAME, user_id=USER_ID, session_id=session_id
    )
    runner = Runner(agent=agent, app_name=APP_NAME, session_service=session_service)

    content = types.Content(role="user", parts=[types.Part(text=prompt)])
    text = ""
    tokens_in = 0
    tokens_out = 0
    async for event in runner.run_async(
        user_id=USER_ID, session_id=session_id, new_message=content
    ):
        usage = getattr(event, "usage_metadata", None)
        if usage is not None:
            tokens_in += getattr(usage, "prompt_token_count", 0) or 0
            tokens_out += getattr(usage, "candidates_token_count", 0) or 0
        if event.is_final_response() and event.content and event.content.parts:
            text = event.content.parts[0].text or ""

    if tokens_in == 0:
        tokens_in = _estimate_tokens(prompt + system_instruction)
    if tokens_out == 0:
        tokens_out = _estimate_tokens(text)

    return text, tokens_in, tokens_out


async def _run_with_openai(
    prompt: str,
    model: str,
    system_instruction: str,
    api_base: str,
    api_key: str,
) -> tuple[str, int, int]:
    """Run one turn via direct OpenAI-compatible HTTP call (no ADK overhead)."""
    import httpx

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{api_base}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": prompt},
                ],
            },
        )
        resp.raise_for_status()
        data = resp.json()

    text = data["choices"][0]["message"]["content"] or ""
    usage = data.get("usage", {})
    tokens_in = usage.get("prompt_tokens", _estimate_tokens(prompt + system_instruction))
    tokens_out = usage.get("completion_tokens", _estimate_tokens(text))
    return text, tokens_in, tokens_out


async def run_agent(
    prompt: str,
    deployment: str,
    *,
    system_instruction: str = "You are a precise KYC analysis assistant.",
    offline_response: str = "",
) -> LlmResult:
    """Run a one-shot agent turn and return text + cost.

    `deployment` is the Azure deployment name or a hint used to select the
    equivalent model for other providers.
    """
    if config.azure_configured():
        model = f"azure/{deployment}"
        text, tokens_in, tokens_out = await _run_with_litellm(prompt, model, system_instruction)
        return LlmResult(
            text=text, tokens_in=tokens_in, tokens_out=tokens_out,
            usd=config.usd_for(model, tokens_in, tokens_out),
            model=model, offline=False,
        )

    if config.google_configured():
        os.environ.setdefault("GEMINI_API_KEY", config.GOOGLE_API_KEY)
        model = _gemini_model_for(deployment)
        text, tokens_in, tokens_out = await _run_with_litellm(prompt, model, system_instruction)
        return LlmResult(
            text=text, tokens_in=tokens_in, tokens_out=tokens_out,
            usd=config.usd_for(model, tokens_in, tokens_out),
            model=model, offline=False,
        )

    if config.publicai_configured():
        model = _publicai_model_for(deployment)
        api_key = os.environ.get("PUBLICAI_API_KEY", "")
        text, tokens_in, tokens_out = await _run_with_openai(
            prompt, model, system_instruction,
            api_base=config.PUBLICAI_BASE_URL,
            api_key=api_key,
        )
        return LlmResult(
            text=text, tokens_in=tokens_in, tokens_out=tokens_out,
            usd=config.usd_for(model, tokens_in, tokens_out),
            model=model, offline=False,
        )

    text = offline_response or "[offline demo - no LLM key configured]"
    tokens_in = _estimate_tokens(prompt + system_instruction)
    tokens_out = _estimate_tokens(text)
    return LlmResult(
        text=text, tokens_in=tokens_in, tokens_out=tokens_out,
        usd=config.usd_for(deployment, tokens_in, tokens_out),
        model=f"offline/{deployment}", offline=True,
    )
