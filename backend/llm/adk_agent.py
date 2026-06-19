"""The single LLM path: Google ADK driving Azure OpenAI or Google Gemini via LiteLLM.

Every model call in the pipeline goes through `run_agent`, which returns the text
plus token usage and a USD cost from the deterministic price table in `config.py`.

Priority: Azure > Google Gemini > offline stub.

Offline behaviour: if neither Azure nor Google is configured, `run_agent` returns
the caller's `offline_response` (clearly labelled demo fallback, not a silent mock)
with an estimated token count, so the whole pipeline runs end to end without any key.
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


async def _run_with_litellm(
    prompt: str,
    model: str,
    system_instruction: str,
) -> tuple[str, int, int]:
    """Run one turn via Google ADK + LiteLLM; return (text, tokens_in, tokens_out)."""
    from google.adk.agents import LlmAgent
    from google.adk.models.lite_llm import LiteLlm
    from google.adk.runners import Runner
    from google.adk.sessions import InMemorySessionService
    from google.genai import types

    agent = LlmAgent(
        model=LiteLlm(model=model),
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


async def run_agent(
    prompt: str,
    deployment: str,
    *,
    system_instruction: str = "You are a precise KYC analysis assistant.",
    offline_response: str = "",
) -> LlmResult:
    """Run a one-shot agent turn and return text + cost.

    `deployment` is the Azure deployment name or a hint used to select the
    equivalent Gemini model when Azure is unavailable.
    """
    if config.azure_configured():
        model = f"azure/{deployment}"
        text, tokens_in, tokens_out = await _run_with_litellm(prompt, model, system_instruction)
        return LlmResult(
            text=text,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            usd=config.usd_for(model, tokens_in, tokens_out),
            model=model,
            offline=False,
        )

    if config.google_configured():
        os.environ.setdefault("GEMINI_API_KEY", config.GOOGLE_API_KEY)
        # Map Azure deployment hint to equivalent Gemini tier.
        model = (
            config.GEMINI_DEEP
            if deployment == config.DEPLOYMENT_DEEP
            else config.GEMINI_REASONING
        )
        text, tokens_in, tokens_out = await _run_with_litellm(prompt, model, system_instruction)
        return LlmResult(
            text=text,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            usd=config.usd_for(model, tokens_in, tokens_out),
            model=model,
            offline=False,
        )

    text = offline_response or "[offline demo - no LLM key configured]"
    tokens_in = _estimate_tokens(prompt + system_instruction)
    tokens_out = _estimate_tokens(text)
    return LlmResult(
        text=text,
        tokens_in=tokens_in,
        tokens_out=tokens_out,
        usd=config.usd_for(deployment, tokens_in, tokens_out),
        model=f"offline/{deployment}",
        offline=True,
    )
