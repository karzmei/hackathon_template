"""Tunable drift-scoring parameters: dimension weights and band thresholds.

Pulled out of the step modules so the scoring can be tuned in one place without
touching pipeline code. Karina is the primary editor; coordinate changes here, a
weight or threshold tweak moves every alert's band.
"""

from __future__ import annotations

from schemas import Dimension

# Per-dimension weights; they sum to 1.0 so the aggregate is already in [0, 1].
WEIGHTS: dict[Dimension, float] = {
    Dimension.business_model: 0.25,
    Dimension.ownership: 0.20,
    Dimension.legal_form: 0.15,
    Dimension.expected_volume: 0.15,
    Dimension.risk_rating: 0.15,
    Dimension.domain: 0.10,
}

# Aggregate drift at or above these cut the band to high / medium respectively.
HIGH_THRESHOLD = 0.67
MEDIUM_THRESHOLD = 0.34

# Signals below this confidence are treated as immaterial noise and dropped at step 1.
MATERIALITY_THRESHOLD = 0.35
