"""@unit tests for cost accounting and schema serialization.

The price table and token estimate must be deterministic (the cost meter depends on
it), and the DriftDimension from/to aliases must survive a round trip (the frontend
reads those exact JSON keys).
"""

import unittest

import config
from llm.adk_agent import _estimate_tokens
from schemas import Cost, Dimension, DriftDimension


class PricingTest(unittest.TestCase):
    def test_known_deployment_uses_its_rate(self):
        in_rate, out_rate = config.PRICING[config.DEPLOYMENT_REASONING]
        expected = round((1000 / 1000) * in_rate + (1000 / 1000) * out_rate, 6)
        self.assertEqual(config.usd_for(config.DEPLOYMENT_REASONING, 1000, 1000), expected)

    def test_unknown_deployment_falls_back_to_default(self):
        self.assertEqual(config.price_for("does-not-exist"), config._DEFAULT_PRICE)
        in_rate, out_rate = config._DEFAULT_PRICE
        expected = round((2000 / 1000) * in_rate + (500 / 1000) * out_rate, 6)
        self.assertEqual(config.usd_for("does-not-exist", 2000, 500), expected)

    def test_zero_tokens_is_zero_cost(self):
        self.assertEqual(config.usd_for(config.DEPLOYMENT_DEEP, 0, 0), 0.0)

    def test_cost_rounds_to_six_decimals(self):
        usd = config.usd_for(config.DEPLOYMENT_DEEP, 1, 1)
        self.assertEqual(usd, round(usd, 6))


class EstimateTokensTest(unittest.TestCase):
    def test_roughly_four_chars_per_token(self):
        self.assertEqual(_estimate_tokens("a" * 40), 10)

    def test_floor_of_one(self):
        self.assertEqual(_estimate_tokens(""), 1)
        self.assertEqual(_estimate_tokens("ab"), 1)


class CostAddTest(unittest.TestCase):
    def test_add_sums_tokens_and_usd(self):
        total = Cost(tokens_in=10, tokens_out=5, usd=0.001).add(
            Cost(tokens_in=20, tokens_out=7, usd=0.002)
        )
        self.assertEqual(total.tokens_in, 30)
        self.assertEqual(total.tokens_out, 12)
        self.assertEqual(total.usd, 0.003)

    def test_default_cost_is_zero(self):
        c = Cost()
        self.assertEqual((c.tokens_in, c.tokens_out, c.usd), (0, 0, 0.0))


class DriftDimensionAliasTest(unittest.TestCase):
    def test_round_trips_from_and_to_aliases(self):
        dim = DriftDimension.model_validate(
            {"dimension": Dimension.domain, "from": "a.ch", "to": "b.io", "delta": 1.0, "weight": 0.1}
        )
        self.assertEqual(dim.from_value, "a.ch")
        self.assertEqual(dim.to_value, "b.io")
        dumped = dim.model_dump(by_alias=True)
        self.assertIn("from", dumped)
        self.assertIn("to", dumped)
        self.assertNotIn("from_value", dumped)


if __name__ == "__main__":
    unittest.main()
