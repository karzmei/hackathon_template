from __future__ import annotations

import hashlib
import math
import re
from typing import Any, Literal

from kyc_checkup.kyc_schemas import (
    AnchorMatch,
    BaselineAnchor,
    MatchLevel,
    NoGoHit,
    WebsiteChangeRequest,
    WebsiteChangeResult,
)

EMBEDDING_MODEL = "intfloat/multilingual-e5-small"
LOW_DRIFT_THRESHOLD = 0.30
MEDIUM_DRIFT_THRESHOLD = 0.40
STRONG_MATCH_THRESHOLD = 0.75
MODERATE_MATCH_THRESHOLD = 0.60

NO_GO_TERMS = {
    "gambling": [
        "casino", "betting", "sportsbook", "poker", "slots",
        "wagering", "lottery"
    ],
    "weapons": [
        "firearms", "ammunition", "missiles", "arms trading",
        "military weapons", "explosives", "defence"
    ],
    "adult": ["adult entertainment", "pornography", "escort services"],
    "sanctions_risk": [
        "sanctioned", "embargoed", "OFAC", "North Korea", "Iran",
        "Russia military",
    ],
}

NEGATIVE_CONTEXT_TERMS = [
    "we do not", "prohibited", "against", "prevent", "detect",
    "compliance", "risk monitoring",
]
ACTIVITY_CONTEXT_TERMS = [
    "we offer", "our services", "play now", "bet now", "place a bet",
    "buy ammunition",
]

_embedding_model: Any = None


def build_baseline_anchors(request: WebsiteChangeRequest) -> list[BaselineAnchor]:
    anchors: list[BaselineAnchor] = []
    if request.approved_business_description:
        anchors.append(
            BaselineAnchor(
                anchor_type="business_activity",
                text=(
                    "Approved business activity: "
                    f"{request.approved_business_description}"
                ),
            )
        )
    if request.approved_sectors:
        anchors.append(BaselineAnchor(
            anchor_type="sectors",
            text=f"Approved sectors: {', '.join(request.approved_sectors)}",
        ))
    if request.approved_products_services:
        anchors.append(
            BaselineAnchor(
                anchor_type="products_services",
                text=(
                    "Approved products and services: "
                    f"{', '.join(request.approved_products_services)}"
                ),
            )
        )
    if request.approved_customer_types:
        anchors.append(
            BaselineAnchor(
                anchor_type="customer_types",
                text=(
                    "Approved customer types: "
                    f"{', '.join(request.approved_customer_types)}"
                ),
            )
        )
    if request.approved_geographies:
        anchors.append(
            BaselineAnchor(
                anchor_type="geographies",
                text=f"Approved geographies: {', '.join(request.approved_geographies)}",
            )
        )
    return anchors


def clean_website_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def chunk_text(text: str, max_chars: int = 800) -> list[str]:
    if max_chars <= 0:
        raise ValueError("max_chars must be positive")
    return [
        text[start:start + max_chars].strip()
        for start in range(0, len(text), max_chars)
        if text[start:start + max_chars].strip()
    ]


def hash_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _get_embedding_model() -> Any:
    global _embedding_model
    if _embedding_model is None:
        from sentence_transformers import SentenceTransformer

        _embedding_model = SentenceTransformer(EMBEDDING_MODEL)
    return _embedding_model


def embed_text(text: str) -> list[float]:
    embedding = _get_embedding_model().encode(
        "passage: " + text,
        normalize_embeddings=True,
    )
    return embedding.tolist()


def cosine_similarity(vec1: list[float], vec2: list[float]) -> float:
    if len(vec1) != len(vec2) or not vec1:
        return 0.0
    norm1 = math.sqrt(sum(value * value for value in vec1))
    norm2 = math.sqrt(sum(value * value for value in vec2))
    if not norm1 or not norm2:
        return 0.0
    return sum(a * b for a, b in zip(vec1, vec2)) / (norm1 * norm2)


def classify_match_level(score: float) -> MatchLevel:
    if score >= STRONG_MATCH_THRESHOLD:
        return "strong"
    if score >= MODERATE_MATCH_THRESHOLD:
        return "moderate"
    return "weak"


def compute_profile_match(
    baseline_anchors: list[BaselineAnchor],
    website_chunks: list[str],
) -> tuple[float, list[AnchorMatch]]:
    if not baseline_anchors or not website_chunks:
        return 1.0, []

    chunk_embeddings = [embed_text(chunk) for chunk in website_chunks]
    matches = []
    for anchor in baseline_anchors:
        anchor_embedding = embed_text(anchor.text)
        scores = [
            cosine_similarity(anchor_embedding, chunk_embedding)
            for chunk_embedding in chunk_embeddings
        ]
        best_index = max(range(len(scores)), key=scores.__getitem__)
        best_score = round(max(0.0, min(1.0, scores[best_index])), 4)
        matches.append(
            AnchorMatch(
                anchor_type=anchor.anchor_type,
                anchor_text=anchor.text,
                best_matching_snippet=website_chunks[best_index],
                score=best_score,
                match_level=classify_match_level(best_score),
            )
        )

    profile_match_score = sum(match.score for match in matches) / len(matches)
    return round(profile_match_score, 4), matches


def detect_no_go_terms(text: str) -> list[NoGoHit]:
    lowered = text.casefold()
    hits = []
    for category, terms in NO_GO_TERMS.items():
        for term in terms:
            index = lowered.find(term.casefold())
            if index == -1:
                continue
            start = max(0, index - 60)
            end = min(len(text), index + len(term) + 60)
            context = text[start:end].strip()
            lowered_context = context.casefold()
            has_negative_context = any(
                marker in lowered_context for marker in NEGATIVE_CONTEXT_TERMS
            )
            if has_negative_context:
                continue
            hits.append(NoGoHit(
                category=category,
                term=term,
                evidence_snippet=context,
            ))
    return hits


def decide_alert_level(
    drift_score: float,
    no_go_hits: list[NoGoHit],
) -> Literal["none", "low", "medium", "high"]:
    category_counts = {
        hit.category: sum(other.category == hit.category for other in no_go_hits)
        for hit in no_go_hits
    }
    has_activity_context = any(
        marker in (hit.evidence_snippet or "").casefold()
        for hit in no_go_hits
        for marker in ACTIVITY_CONTEXT_TERMS
    )
    if has_activity_context or any(count >= 2 for count in category_counts.values()):
        return "high"
    if drift_score >= MEDIUM_DRIFT_THRESHOLD:
        return "medium"
    if no_go_hits or drift_score >= LOW_DRIFT_THRESHOLD:
        return "low"
    return "none"


def build_evidence(
    anchor_matches: list[AnchorMatch],
    no_go_hits: list[NoGoHit],
    drift_score: float,
) -> list[str]:
    evidence = []
    for match in anchor_matches:
        if match.match_level != "weak":
            continue
        label = match.anchor_type.replace("_", " ")
        snippet = match.best_matching_snippet[:160]
        evidence.append(
            f"Approved {label} matched weakly against the current website text."
        )
        evidence.append(f"Best website snippet for {label}: '{snippet}'")

    for hit in no_go_hits:
        evidence.append(
            f"Matched no-go category '{hit.category}' via term '{hit.term}'."
        )
        if hit.evidence_snippet:
            evidence.append(f"No-go evidence: '{hit.evidence_snippet[:160]}'")

    if drift_score >= MEDIUM_DRIFT_THRESHOLD:
        evidence.append(
            f"Drift score {drift_score:.2f} exceeded the medium threshold "
            f"{MEDIUM_DRIFT_THRESHOLD:.2f}."
        )
    elif drift_score >= LOW_DRIFT_THRESHOLD:
        evidence.append(
            f"Drift score {drift_score:.2f} exceeded the low threshold "
            f"{LOW_DRIFT_THRESHOLD:.2f}."
        )
    return evidence


def analyze_website_change(request: WebsiteChangeRequest) -> WebsiteChangeResult:
    cleaned_text = clean_website_text(request.website_text)
    no_go_hits = detect_no_go_terms(cleaned_text)
    profile_match_score, anchor_matches = compute_profile_match(
        build_baseline_anchors(request),
        chunk_text(cleaned_text),
    )
    drift_score = round(1 - profile_match_score, 4)
    alert_level = decide_alert_level(drift_score, no_go_hits)

    if anchor_matches:
        weakest_match = min(anchor_matches, key=lambda match: match.score)
        if alert_level == "none":
            semantic_drift_summary = (
                f"The baseline anchors had sufficient matches, with a profile match "
                f"score of {profile_match_score:.2f}. The weakest match was for "
                f"approved {weakest_match.anchor_type.replace('_', ' ')}."
            )
        else:
            semantic_drift_summary = (
                f"The profile match score is {profile_match_score:.2f}, giving a drift "
                f"score of {drift_score:.2f}. The weakest match was for approved "
                f"{weakest_match.anchor_type.replace('_', ' ')}."
            )
    else:
        semantic_drift_summary = "There was insufficient website or baseline text to compare."

    if no_go_hits:
        categories = sorted({hit.category for hit in no_go_hits})
        terms = sorted({hit.term for hit in no_go_hits})
        no_go_summary = (
            f"Detected categories: {', '.join(categories)}; "
            f"matched terms: {', '.join(terms)}."
        )
    else:
        no_go_summary = None

    if no_go_hits and alert_level == "high":
        main_reason = "No-go category detection indicates possible prohibited activity."
        recommended_action = "Escalate for compliance review."
    elif no_go_hits:
        main_reason = "Ambiguous no-go terms require review before drawing a conclusion."
        recommended_action = "Review the website context before drawing a conclusion."
    elif alert_level != "none":
        main_reason = (
            "Possible semantic business drift was detected because approved profile "
            "anchors did not consistently match the current website text."
        )
        recommended_action = "Review the website evidence and confirm the business activity."
    else:
        main_reason = "The website appears broadly consistent with the approved profile."
        recommended_action = "No action required."

    return WebsiteChangeResult(
        client_id=request.client_id,
        trigger_type=request.trigger_type,
        website_text_hash=hash_text(cleaned_text),
        embedding_model=EMBEDDING_MODEL,
        profile_match_score=profile_match_score,
        drift_score=drift_score,
        alert_level=alert_level,
        no_go_hits=no_go_hits,
        matched_no_go_categories=sorted({hit.category for hit in no_go_hits}),
        matched_no_go_terms=[hit.term for hit in no_go_hits],
        anchor_matches=anchor_matches,
        main_reason=main_reason,
        semantic_drift_summary=semantic_drift_summary,
        no_go_summary=no_go_summary,
        recommended_action=recommended_action,
        evidence=build_evidence(anchor_matches, no_go_hits, drift_score),
    )
