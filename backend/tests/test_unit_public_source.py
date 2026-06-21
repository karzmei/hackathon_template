"""@unit tests for the public-plane source aggregation and demo fallback.

`fetch_public_signals` runs each connector and, for any source that returns
nothing (a stub, a failed live request, or no hits), falls back to that source's
demo fixtures. These tests pin that per-source fallback offline by patching the
only live connector (gdelt) at the HTTP-free `fetch` boundary; the other
connectors are stubs that already return nothing.
"""

import unittest
from unittest.mock import patch

from data import seed
from schemas import Signal, Source, SignalKind
import sources.public_source as public_source

_CLIENT = "helvetia"


def _seed_sources(client_id: str) -> set[Source]:
    return {s.source for s in seed.public_signals_for(client_id)}


class FetchPublicSignalsTest(unittest.TestCase):
    def test_falls_back_to_full_demo_when_every_connector_is_empty(self):
        # gdelt is the only live connector; force it empty so nothing touches the network.
        with patch.object(public_source.gdelt, "fetch", return_value=[]):
            result = public_source.fetch_public_signals(_CLIENT)
        # No live data anywhere, so the result is exactly the demo fixtures.
        self.assertEqual(result, seed.public_signals_for(_CLIENT))

    def test_gdelt_failure_falls_back_to_demo_gdelt_signal(self):
        # A failed/empty live fetch must not drop the source; the demo gdelt signal stands in.
        with patch.object(public_source.gdelt, "fetch", return_value=[]):
            result = public_source.fetch_public_signals(_CLIENT)
        self.assertTrue(
            any(s.source == Source.gdelt for s in result),
            "demo gdelt signal should back-fill when the live fetch fails",
        )

    def test_live_gdelt_replaces_only_its_own_source(self):
        live = Signal(
            id="gdelt-live-0",
            client_id=_CLIENT,
            source=Source.gdelt,
            observed_at="20260620T100000Z",
            kind=SignalKind.adverse_media,
            summary="Live wire: regulator opens probe",
            evidence_url="https://news.test/probe",
            confidence=0.6,
            raw={},
        )
        with patch.object(public_source.gdelt, "fetch", return_value=[live]):
            result = public_source.fetch_public_signals(_CLIENT)

        # The live signal is used, and the seeded gdelt fixture is suppressed.
        self.assertIn(live, result)
        gdelt_ids = [s.id for s in result if s.source == Source.gdelt]
        self.assertEqual(gdelt_ids, ["gdelt-live-0"])
        # Every other seeded source still contributes its demo signals.
        other_sources = _seed_sources(_CLIENT) - {Source.gdelt}
        for src in other_sources:
            self.assertTrue(
                any(s.source == src for s in result),
                f"demo signals for {src} must survive when only gdelt goes live",
            )


if __name__ == "__main__":
    unittest.main()
