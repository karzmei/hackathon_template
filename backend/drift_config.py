"""Tunable drift-scoring parameters: dimension severities and band thresholds.

Pulled out of the step modules so the scoring can be tuned in one place without
touching pipeline code. Karina is the primary editor; coordinate changes here, a
severity or threshold tweak moves every alert's band.

WEIGHTS is now read as SEVERITY in [0, 1]: how bad a full-confidence change in
that dimension is on its own. The engine combines per-dimension contributions
with an L2 (sum of squares, then square root) aggregation rather than a plain
sum, so the score is dominated by the single biggest risk; many small drifts add
up to less than one large one. Severities no longer need to sum to 1.
"""

from __future__ import annotations

from schemas import Dimension

# Per-dimension severity in [0, 1]: the standalone alarm of a full-confidence change.
WEIGHTS: dict[Dimension, float] = {
    Dimension.risk_rating: 1.0,
    Dimension.business_model: 0.9,
    Dimension.ownership: 0.85,
    Dimension.jurisdiction: 0.8,
    Dimension.legal_form: 0.5,
    Dimension.expected_volume: 0.4,
    Dimension.domain: 0.4,
}

# Aggregate drift at or above these cut the band to high / medium respectively.
# Calibrated for the L2 scale: a single max-severity full-confidence change (1.0)
# and the Helvetia seed both land HIGH; a single low-severity modest change stays LOW.
HIGH_THRESHOLD = 0.8
MEDIUM_THRESHOLD = 0.45

# Signals below this confidence are treated as immaterial noise and dropped at step 1.
MATERIALITY_THRESHOLD = 0.35
