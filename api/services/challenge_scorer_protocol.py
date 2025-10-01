"""
Challenge scorer protocol and type definitions.

Defines the interface for custom scoring plugins that compute
numeric scores from attempt metrics for leaderboard ranking.
"""

from __future__ import annotations

from typing import Any, Protocol, TypedDict


class ScoringContext(TypedDict, total=False):
    """Context provided to scorer plugins."""

    tenant_id: str
    app_id: str
    workflow_id: str
    challenge_id: str
    end_user_id: str | None
    timeout_ms: int


class AttemptMetrics(TypedDict, total=False):
    """Metrics from a challenge attempt."""

    succeeded: bool
    tokens_total: int | None
    elapsed_ms: int | None
    rating: int | None
    created_at: int | None  # epoch ms


class ScoringResult(TypedDict, total=False):
    """Result returned by scorer plugin."""

    score: float
    details: dict[str, Any] | None


class ScorerProtocol(Protocol):
    """Protocol that all scorer plugins must implement."""

    def score(self, metrics: AttemptMetrics, config: dict[str, Any], ctx: ScoringContext) -> ScoringResult:
        """
        Compute a numeric score from attempt metrics.

        Args:
            metrics: Attempt metrics (tokens, time, rating, etc.)
            config: Plugin-specific configuration (from challenge.scoring_config)
            ctx: Context with tenant_id, app_id, etc.

        Returns:
            ScoringResult with computed score and optional details
        """
        ...
