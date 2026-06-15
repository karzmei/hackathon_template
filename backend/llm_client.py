import os

import requests
from dotenv import load_dotenv

from backend.schemas import OutputType, Tone

load_dotenv()

OPENROUTER_CHAT_COMPLETIONS_URL = "https://openrouter.ai/api/v1/chat/completions"


def summarize_notes(text: str, output_type: OutputType, tone: Tone) -> dict:
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY is not set")

    model = os.environ.get("OPENROUTER_MODEL")
    if not model:
        raise RuntimeError("OPENROUTER_MODEL is not set")

    prompt = build_prompt(text=text, output_type=output_type, tone=tone)

    try:
        response = requests.post(
            OPENROUTER_CHAT_COMPLETIONS_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You turn messy notes into clear, useful structured markdown. "
                            "Return only the requested markdown output."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.2,
            },
            timeout=60,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise RuntimeError(f"OpenRouter request failed: {exc}") from exc

    data = response.json()
    choices = data.get("choices", [])
    content = choices[0].get("message", {}).get("content", "") if choices else ""
    if not content:
        raise RuntimeError("OpenRouter returned an empty response")

    return {
        "output_type": output_type,
        "tone": tone,
        "result": content.strip(),
        "provider": "openrouter",
        "model": model,
    }


def build_prompt(text: str, output_type: OutputType, tone: Tone) -> str:
    return f"""
Transform these messy notes into a structured {output_type}.

Tone: {tone}

Use markdown. Include only sections relevant to the selected output type.
For the default summary mode, use this format:

## Summary

...

## Open questions

* ...

Messy notes:
{text}
""".strip()
