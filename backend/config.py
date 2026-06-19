"""Environment-driven settings and the deterministic model price table.

LiteLLM reads the AZURE_* variables directly from the environment, so we only
need to surface the deployment names and a price table here. The price table
lives in code (not the LLM response) so the cost meter is demo-stable.
"""

from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()


# Azure deployment names (these are what we pass to LiteLLM as azure/<deployment>).
DEPLOYMENT_REASONING = os.environ.get("AZURE_OPENAI_DEPLOYMENT_REASONING", "gpt-4o-mini")
DEPLOYMENT_DEEP = os.environ.get("AZURE_OPENAI_DEPLOYMENT_DEEP", "gpt-4o")

# Frontend origin allowed through CORS.
FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000")

# USD per 1k tokens (input, output). Keyed by deployment name; falls back to a
# default so an unknown deployment still produces a sensible cost figure.
PRICING: dict[str, tuple[float, float]] = {
    DEPLOYMENT_REASONING: (0.00015, 0.00060),  # mid-tier
    DEPLOYMENT_DEEP: (0.0025, 0.0100),          # top-tier
}
_DEFAULT_PRICE = (0.0005, 0.0015)


def azure_configured() -> bool:
    """True only when enough Azure config exists to make a real call."""
    return bool(
        os.environ.get("AZURE_API_KEY")
        and os.environ.get("AZURE_API_BASE")
        and os.environ.get("AZURE_API_VERSION")
    )


def price_for(deployment: str) -> tuple[float, float]:
    return PRICING.get(deployment, _DEFAULT_PRICE)


def usd_for(deployment: str, tokens_in: int, tokens_out: int) -> float:
    in_rate, out_rate = price_for(deployment)
    return round((tokens_in / 1000) * in_rate + (tokens_out / 1000) * out_rate, 6)
