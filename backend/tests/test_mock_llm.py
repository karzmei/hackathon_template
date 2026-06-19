"""@smoke tests that mock the LLM boundary (mirrors the inc-b2c *.mock.test pattern).

Each pipeline step imports `run_agent` into its own namespace, so we patch it there
with an AsyncMock to drive responses the offline stub never produces: a model that
drops a signal, malformed output, and a real (online) token/cost reading. We also
drive the orchestrator's "dies at step 2" branch, which the seed data never hits.
"""

import asyncio
import json
import unittest
from unittest.mock import AsyncMock, patch

import store
from tests.factories import make_llm_result, make_signal

from data.seed import all_clients, baseline_for, public_signals_for
from pipeline.step1_basic_filter import basic_filter
from pipeline.step2_llm_filter import llm_reasoning_filter
from schemas import Cost, RecommendedAction

HELVETIA = next(c for c in all_clients() if c.id == "helvetia")


def _verdicts(text: str):
    return make_llm_result(text=text)


class Step2VerdictTest(unittest.TestCase):
    def test_drops_signal_and_overrides_confidence_per_verdict(self):
        a = make_signal(id="a", confidence=0.8)
        b = make_signal(id="b", summary="other", confidence=0.8)
        verdict = json.dumps(
            {"results": [
                {"id": "a", "keep": True, "confidence": 0.99},
                {"id": "b", "keep": False},
            ]}
        )
        with patch("pipeline.step2_llm_filter.run_agent", new=AsyncMock(return_value=_verdicts(verdict))):
            kept, cost = asyncio.run(llm_reasoning_filter([a, b]))

        self.assertEqual([s.id for s in kept], ["a"])
        self.assertEqual(kept[0].confidence, 0.99)
        self.assertGreater(cost.tokens_in, 0)

    def test_fail_open_keeps_all_on_unparseable_output(self):
        a = make_signal(id="a")
        b = make_signal(id="b", summary="other")
        with patch("pipeline.step2_llm_filter.run_agent", new=AsyncMock(return_value=_verdicts("not json at all"))):
            kept, _ = asyncio.run(llm_reasoning_filter([a, b]))

        self.assertEqual([s.id for s in kept], ["a", "b"])

    def test_online_token_usage_flows_into_cost(self):
        a = make_signal(id="a")
        online = make_llm_result(
            text=json.dumps({"results": [{"id": "a", "keep": True}]}),
            tokens_in=123,
            tokens_out=45,
            usd=0.5,
            offline=False,
        )
        with patch("pipeline.step2_llm_filter.run_agent", new=AsyncMock(return_value=online)):
            kept, cost = asyncio.run(llm_reasoning_filter([a]))

        self.assertEqual([s.id for s in kept], ["a"])
        self.assertEqual(cost, Cost(tokens_in=123, tokens_out=45, usd=0.5))


class OrchestratorDiesAtStep2Test(unittest.TestCase):
    """Patch step 2 to drop everything; the cascade should stop at depth 2."""

    def test_no_survivors_after_step2_is_depth_two_no_change(self):
        from pipeline import orchestrator

        spent = Cost(tokens_in=10, tokens_out=2, usd=0.0009)
        dropped = AsyncMock(return_value=([], spent))
        store.reset()
        with patch.object(orchestrator, "llm_reasoning_filter", dropped):
            alert = asyncio.run(orchestrator.run_pipeline(HELVETIA))

        self.assertEqual(alert.analysis_depth, 2)
        self.assertEqual(alert.recommended_action, RecommendedAction.no_change)
        self.assertEqual(alert.drift_score.aggregate, 0.0)
        self.assertEqual(alert.cost, spent)  # step-2 cost is still recorded

    def test_step1_survivors_exist_for_helvetia(self):
        # Guards the premise of the test above: helvetia does reach step 2.
        survivors = basic_filter(public_signals_for("helvetia"))
        self.assertTrue(survivors)
        self.assertIsNotNone(baseline_for("helvetia"))


if __name__ == "__main__":
    unittest.main()
