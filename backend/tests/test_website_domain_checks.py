"""@unit tests for explainable website drift results."""

import unittest
from unittest.mock import patch

from kyc_checkup.kyc_schemas import AnchorMatch, WebsiteChangeRequest
from kyc_checkup.website_domain_checks import (
    analyze_website_change,
    build_baseline_anchors,
)


def _request(website_text: str) -> WebsiteChangeRequest:
    return WebsiteChangeRequest(
        client_id="client-1",
        approved_business_description="B2B logistics analytics software",
        approved_products_services=["forecasting", "routing analytics"],
        website_text=website_text,
    )


def _weak_match() -> AnchorMatch:
    return AnchorMatch(
        anchor_type="products_services",
        anchor_text="Approved products and services: forecasting, routing analytics",
        best_matching_snippet="Digital asset settlement for institutional clients.",
        score=0.41,
        match_level="weak",
    )


class WebsiteExplainabilityTest(unittest.TestCase):
    def test_anchors_have_explicit_types(self):
        anchors = build_baseline_anchors(_request("Logistics analytics software."))

        self.assertEqual(anchors[0].anchor_type, "business_activity")
        self.assertEqual(anchors[1].anchor_type, "products_services")

    def test_no_go_alert_has_evidence_and_reason(self):
        anchor_match = AnchorMatch(
            anchor_type="business_activity",
            anchor_text="Approved business activity: fintech analytics",
            best_matching_snippet="We offer casino and sportsbook services. Play now.",
            score=0.8,
            match_level="strong",
        )
        with patch(
            "kyc_checkup.website_domain_checks.compute_profile_match",
            return_value=(0.8, [anchor_match]),
        ):
            result = analyze_website_change(
                _request("We offer casino and sportsbook services. Play now.")
            )

        self.assertEqual(result.alert_level, "high")
        self.assertIn("No-go", result.main_reason)
        self.assertTrue(result.no_go_hits[0].evidence_snippet)

    def test_semantic_drift_result_is_structured_without_text_diff(self):
        with patch(
            "kyc_checkup.website_domain_checks.compute_profile_match",
            return_value=(0.58, [_weak_match()]),
        ):
            result = analyze_website_change(
                _request("Digital asset settlement for institutional clients.")
            )

        dumped = result.model_dump()
        self.assertEqual(result.alert_level, "medium")
        self.assertIn("semantic business drift", result.main_reason)
        self.assertEqual(result.anchor_matches[0].match_level, "weak")
        self.assertNotIn("previous_website_text", dumped)
        self.assertNotIn("new_terms", dumped)
        self.assertNotIn("removed_terms", dumped)


if __name__ == "__main__":
    unittest.main()
