"""@unit tests for the GDELT adverse-media connector.

Exercise the real `gdelt.fetch` / `gdelt.fetch_gdelt_news` functions offline by
mocking only the HTTP boundary (`requests.Session.get`). Covers the field
mapping, the empty-list fallbacks, and the `client_id -> Signal` shaping. No real
network, so the suite stays offline like the rest of the tests.
"""

import unittest
from unittest.mock import MagicMock, patch

import requests

from sources.connectors import gdelt
from schemas import Source, SignalKind


def _mock_response(payload: dict) -> MagicMock:
    """A requests-style response whose .json() returns `payload`."""
    response = MagicMock()
    response.raise_for_status.return_value = None
    response.json.return_value = payload
    return response


class FetchGdeltNewsTest(unittest.TestCase):
    """Tests for the article-fetching / mapping helper."""

    def test_maps_article_fields_to_simplified_dicts(self):
        payload = {
            "articles": [
                {
                    "title": "Probe opened into ACME",
                    "url": "https://news.test/acme",
                    "domain": "news.test",
                    "seendate": "20260620T100000Z",
                    "language": "English",
                    "socialimage": "https://news.test/acme.jpg",
                }
            ]
        }
        with patch.object(requests.Session, "get", return_value=_mock_response(payload)):
            results = gdelt.fetch_gdelt_news("ACME Corp", days_back=7)

        self.assertEqual(len(results), 1)
        article = results[0]
        self.assertEqual(
            article,
            {
                "title": "Probe opened into ACME",
                "url": "https://news.test/acme",
                "domain": "news.test",
                "published_date": "20260620T100000Z",  # seendate -> published_date
                "language": "English",
                "image_url": "https://news.test/acme.jpg",  # socialimage -> image_url
            },
        )

    def test_returns_empty_on_network_error(self):
        with patch.object(
            requests.Session, "get", side_effect=requests.exceptions.ConnectionError()
        ):
            self.assertEqual(gdelt.fetch_gdelt_news("ACME Corp"), [])


class FetchTest(unittest.TestCase):
    """Tests for the connector entry point `fetch(client_id) -> list[Signal]`."""

    def test_returns_empty_for_unknown_client(self):
        # Real StopIteration path; no network is touched.
        self.assertEqual(gdelt.fetch("does-not-exist"), [])

    def test_maps_articles_to_signals_for_known_client(self):
        articles = [
            {"title": "Helvetia under FINMA probe", "url": "https://news.test/1"},
            {"title": "Second report", "url": "https://news.test/2", "published_date": "2026-06-19"},
        ]
        with patch.object(gdelt, "fetch_gdelt_news", return_value=articles) as fetch_news:
            signals = gdelt.fetch("helvetia")

        # The legal name resolved from seed is what we query GDELT with.
        fetch_news.assert_called_once_with("Helvetia SaaS GmbH", days_back=7)

        self.assertEqual(len(signals), 2)
        first = signals[0]
        self.assertEqual(first.id, "gdelt-helvetia-0")
        self.assertEqual(first.client_id, "helvetia")
        self.assertEqual(first.source, Source.gdelt)
        self.assertEqual(first.kind, SignalKind.adverse_media)
        self.assertEqual(first.summary, "Helvetia under FINMA probe")
        self.assertEqual(first.evidence_url, "https://news.test/1")
        self.assertEqual(first.confidence, 0.6)
        self.assertEqual(first.raw, articles[0])

        self.assertEqual(signals[1].id, "gdelt-helvetia-1")
        self.assertEqual(signals[1].observed_at, "2026-06-19")


if __name__ == "__main__":
    unittest.main()
