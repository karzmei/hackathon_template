"""GDELT / Google News connector (adverse media).

Maps news hits about the client to adverse_media `Signal` records.

This connector resolves the `client_id` to the client's legal name using the
demo seed data and queries the GDELT docs API. Each returned article is
mapped to a `Signal` (source=Source.gdelt, kind=SignalKind.adverse_media).
If the request fails or no client is known, an empty list is returned.
"""

from __future__ import annotations

from datetime import datetime
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from schemas import Signal, Source, SignalKind
from data import seed


def fetch(client_id: str) -> list[Signal]:
    """Return adverse-media signals for a client identified by `client_id`.

    Looks up the client's legal name in `data.seed.CLIENTS` and queries GDELT
    for recent articles mentioning that name. Maps each article to a
    `Signal` instance and returns the list. Returns [] if the client is not
    found or the external request fails.
    """

    # Resolve client_id -> legal name using the demo seed clients.
    try:
        legal_name = next(c.legal_name for c in seed.CLIENTS if c.id == client_id)
    except StopIteration:
        return []

    articles = fetch_gdelt_news(legal_name, days_back=7)
    signals: list[Signal] = []
    for i, a in enumerate(articles):
        observed = a.get("published_date") or datetime.utcnow().isoformat() + "Z"
        summary = a.get("title", "")
        sig = Signal(
            id=f"gdelt-{client_id}-{i}",
            client_id=client_id,
            source=Source.gdelt,
            observed_at=observed,
            kind=SignalKind.adverse_media,
            summary=summary,
            evidence_url=a.get("url"),
            confidence=0.6,
            raw=a,
        )
        signals.append(sig)

    return signals


def fetch_gdelt_news(company_name: str, days_back: int = 7, max_records: int = 25) -> list[dict]:
    """Query the GDELT docs API for recent articles mentioning `company_name`.

    Returns a list of simplified article dicts with keys: title, url, domain,
    seendate, language, socialimage.
    """

    query = f'"{company_name}"'

    params = {
        "query": query,
        "mode": "artlist",
        "maxrecords": max_records,
        "format": "json",
        "timespan": f"{days_back}d",
        "sort": "DateDesc",
    }

    url = "https://api.gdeltproject.org/api/v2/doc/doc"

    session = requests.Session()
    retry = Retry(
        total=3,
        backoff_factor=2,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET"],
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("https://", adapter)

    try:
        response = session.get(url, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.RequestException:
        return []

    articles = data.get("articles", [])

    results: list[dict] = []
    for article in articles:
        results.append(
            {
                "title": article.get("title", ""),
                "url": article.get("url", ""),
                "domain": article.get("domain", ""),
                "published_date": article.get("seendate", ""),
                "language": article.get("language", ""),
                "image_url": article.get("socialimage", ""),
            }
        )

    return results