"""
Weighted scorer plugin.

Computes a weighted score based on success bonus, rating, elapsed time, and token usage.
"""

from __future__ import annotations

from typing import Any

from services.challenge_scorer_protocol import AttemptMetrics, ScoringContext, ScoringResult


class WeightedScorer:
    """
    Example weighted scorer that combines multiple metrics.

    Configuration options:
    - success_bonus (float): Base points for successful attempt (default: 100)
    - rating_weight (float): Multiplier for judge rating (default: 10)
    - time_penalty (float): Penalty per second elapsed (default: 1.0)
    - token_penalty (float): Penalty per token used (default: 0.01)

    Formula:
        score = success_bonus
                + (rating * rating_weight)
                - (elapsed_seconds * time_penalty)
                - (tokens * token_penalty)
    """

    def score(self, metrics: AttemptMetrics, config: dict[str, Any], ctx: ScoringContext) -> ScoringResult:
        """Compute weighted score from metrics."""
        # Base score for success
        base = 0.0
        if metrics.get("succeeded"):
            base += config.get("success_bonus", 100.0)

        # Add rating contribution
        rating = metrics.get("rating") or 0
        rating_weight = config.get("rating_weight", 10.0)
        rating_score = rating * rating_weight

        # Subtract time penalty
        elapsed_ms = metrics.get("elapsed_ms") or 0
        elapsed_seconds = elapsed_ms / 1000.0
        time_penalty = config.get("time_penalty", 1.0)
        time_score = elapsed_seconds * time_penalty

        # Subtract token penalty
        tokens = metrics.get("tokens_total") or 0
        token_penalty = config.get("token_penalty", 0.01)
        token_score = tokens * token_penalty

        # Compute final score (never negative)
        final_score = base + rating_score - time_score - token_score
        final_score = max(final_score, 0.0)

        return {
            "score": final_score,
            "details": {
                "base": base,
                "rating_contribution": rating_score,
                "time_penalty": time_score,
                "token_penalty": token_score,
            },
        }
