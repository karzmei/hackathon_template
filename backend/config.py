"""Environment-driven settings and the deterministic model price table.

LiteLLM reads the AZURE_* and GEMINI_API_KEY variables directly from the
environment. The price table lives in code (not the LLM response) so the
cost meter is demo-stable.

Priority: Azure > Google > offline stub.
"""

from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()


# Azure deployment names (passed to LiteLLM as azure/<deployment>).
DEPLOYMENT_REASONING = os.environ.get("AZURE_OPENAI_DEPLOYMENT_REASONING", "gpt-4o-mini")
DEPLOYMENT_DEEP = os.environ.get("AZURE_OPENAI_DEPLOYMENT_DEEP", "gpt-4o")

# Google Gemini model names (passed to LiteLLM as gemini/<model>).
GEMINI_REASONING = "gemini/gemini-2.5-flash"
GEMINI_DEEP = "gemini/gemini-2.5-flash"

# Frontend origin allowed through CORS.
FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000")

# Google API key for Gemini fallback.
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "")

# USD per 1k tokens (input, output). Keyed by deployment/model name.
PRICING: dict[str, tuple[float, float]] = {
    DEPLOYMENT_REASONING: (0.00015, 0.00060),   # gpt-4o-mini
    DEPLOYMENT_DEEP: (0.0025, 0.0100),           # gpt-4o
    GEMINI_REASONING: (0.00015, 0.0035),          # gemini-2.5-flash
    GEMINI_DEEP: (0.00015, 0.0035),              # gemini-2.5-flash
}
_DEFAULT_PRICE = (0.0005, 0.0015)


def azure_configured() -> bool:
    return bool(
        os.environ.get("AZURE_API_KEY")
        and os.environ.get("AZURE_API_BASE")
        and os.environ.get("AZURE_API_VERSION")
    )


def google_configured() -> bool:
    return bool(GOOGLE_API_KEY)


def price_for(model: str) -> tuple[float, float]:
    return PRICING.get(model, _DEFAULT_PRICE)


def usd_for(model: str, tokens_in: int, tokens_out: int) -> float:
    in_rate, out_rate = price_for(model)
    return round((tokens_in / 1000) * in_rate + (tokens_out / 1000) * out_rate, 6)
