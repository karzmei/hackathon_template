"""The single LLM path: Google ADK driving Azure OpenAI via LiteLLM.

Every model call in the pipeline goes through `run_agent`, which returns the text
plus token usage and a USD cost computed from the deterministic price table in
`config.py`. That is what makes the per-alert cost meter possible.

Offline behaviour: if Azure is not configured, `run_agent` returns the caller's
`offline_response` (clearly an explicit demo fallback, not a silent mock) with an
estimated token count, so the whole pipeline still runs end to end without a key.
"""

from __future__ import annotations

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
    """Rough token estimate (~4 chars/token) for offline cost figures."""
    return max(1, len(text) // 4)


async def run_agent(
    prompt: str,
    deployment: str,
    *,
    system_instruction: str = "You are a precise KYC analysis assistant.",
    offline_response: str = "",
) -> LlmResult:
    """Run a one-shot agent turn and return text + cost.

    `deployment` is the Azure deployment name; it is passed to LiteLLM as
    `azure/<deployment>` and is also the key into the price table.
    """
    if not config.azure_configured():
        text = offline_response or "[offline demo - no Azure key configured]"
        tokens_in = _estimate_tokens(prompt + system_instruction)
        tokens_out = _estimate_tokens(text)
        return LlmResult(
            text=text,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            usd=config.usd_for(deployment, tokens_in, tokens_out),
            model=f"azure/{deployment}",
            offline=True,
        )

    # Imported lazily so the offline path (and tests) does not require google-adk.
    from google.adk.agents import LlmAgent
    from google.adk.models.lite_llm import LiteLlm
    from google.adk.runners import Runner
    from google.adk.sessions import InMemorySessionService
    from google.genai import types

    agent = LlmAgent(
        model=LiteLlm(model=f"azure/{deployment}"),
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

    # Fall back to an estimate if the provider did not report usage.
    if tokens_in == 0:
        tokens_in = _estimate_tokens(prompt + system_instruction)
    if tokens_out == 0:
        tokens_out = _estimate_tokens(text)

    return LlmResult(
        text=text,
        tokens_in=tokens_in,
        tokens_out=tokens_out,
        usd=config.usd_for(deployment, tokens_in, tokens_out),
        model=f"azure/{deployment}",
        offline=False,
    )
