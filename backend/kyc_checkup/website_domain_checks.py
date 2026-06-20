from __future__ import annotations

import hashlib
import math
import re
from typing import Any, Literal

from kyc_checkup.kyc_schemas import (
    AnchorMatch,
    NoGoHit,
    WebsiteChangeRequest,
    WebsiteChangeResult,
)

EMBEDDING_MODEL = "intfloat/multilingual-e5-small"
LOW_DRIFT_THRESHOLD = 0.30
MEDIUM_DRIFT_THRESHOLD = 0.40

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


def build_baseline_anchors(request: WebsiteChangeRequest) -> list[str]:
    anchors = []
    if request.approved_business_description:
        anchors.append(
            f"Approved business activity: {request.approved_business_description}"
        )
    if request.approved_sectors:
        anchors.append(f"Approved sectors: {', '.join(request.approved_sectors)}")
    if request.approved_products_services:
        anchors.append(
            "Approved products and services: "
            f"{', '.join(request.approved_products_services)}"
        )
    if request.approved_customer_types:
        anchors.append(
            f"Approved customer types: {', '.join(request.approved_customer_types)}"
        )
    if request.approved_geographies:
        anchors.append(
            f"Approved geographies: {', '.join(request.approved_geographies)}"
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


def compute_profile_match(
    baseline_anchors: list[str],
    website_chunks: list[str],
) -> tuple[float, list[AnchorMatch]]:
    if not baseline_anchors or not website_chunks:
        return 1.0, []

    chunk_embeddings = [embed_text(chunk) for chunk in website_chunks]
    matches = []
    for anchor in baseline_anchors:
        anchor_embedding = embed_text(anchor)
        scores = [
            cosine_similarity(anchor_embedding, chunk_embedding)
            for chunk_embedding in chunk_embeddings
        ]
        best_index = max(range(len(scores)), key=scores.__getitem__)
        matches.append(
            AnchorMatch(
                anchor=anchor,
                best_matching_snippet=website_chunks[best_index],
                score=round(max(0.0, min(1.0, scores[best_index])), 4),
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
                evidence=context,
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
        marker in (hit.evidence or "").casefold()
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


def analyze_website_change(request: WebsiteChangeRequest) -> WebsiteChangeResult:
    cleaned_text = clean_website_text(request.website_text)
    no_go_hits = detect_no_go_terms(cleaned_text)
    profile_match_score, anchor_matches = compute_profile_match(
        build_baseline_anchors(request),
        chunk_text(cleaned_text),
    )
    drift_score = round(1 - profile_match_score, 4)
    alert_level = decide_alert_level(drift_score, no_go_hits)

    if no_go_hits and alert_level == "high":
        explanation = "The website context indicates possible prohibited activity."
        recommended_action = "Escalate for compliance review."
    elif no_go_hits:
        explanation = "The website contains ambiguous terms linked to a prohibited activity."
        recommended_action = "Review the website context before drawing a conclusion."
    elif alert_level != "none":
        explanation = "The website shows possible business drift from the approved profile."
        recommended_action = "Review the website evidence and confirm the business activity."
    else:
        explanation = "No material website risk signal was detected."
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
        explanation=explanation,
        recommended_action=recommended_action,
        evidence=[hit.evidence for hit in no_go_hits if hit.evidence],
    )
