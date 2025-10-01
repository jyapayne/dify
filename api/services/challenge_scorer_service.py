"""
Challenge scorer service.

Loads and invokes custom scorer plugins to compute scores from attempt metrics.
"""

from __future__ import annotations

import logging
from typing import Any

from services.challenge_scorer_protocol import AttemptMetrics, ScoringContext, ScoringResult

logger = logging.getLogger(__name__)


class ChallengeScorerService:
    """Service for loading and invoking custom scorer plugins."""

    _plugin_cache: dict[str, Any] = {}

    @classmethod
    def score_with_plugin(
        cls,
        *,
        scorer_plugin_id: str | None,
        scorer_entrypoint: str | None,
        metrics: AttemptMetrics,
        config: dict[str, Any] | None,
        ctx: ScoringContext,
    ) -> ScoringResult:
        """
        Compute score using a custom scorer plugin.

        Args:
            scorer_plugin_id: Plugin identifier (e.g., 'builtin.weighted_scorer')
            scorer_entrypoint: Entrypoint path (e.g., 'services.scorers.weighted:WeightedScorer')
            metrics: Attempt metrics to score
            config: Plugin-specific configuration
            ctx: Scoring context

        Returns:
            ScoringResult with computed score

        Raises:
            ValueError: If plugin cannot be loaded or scoring fails
        """
        if not scorer_plugin_id or not scorer_entrypoint:
            raise ValueError("scorer_plugin_id and scorer_entrypoint are required for custom scoring")

        # Load plugin
        scorer = cls._load_plugin(scorer_plugin_id, scorer_entrypoint)
        if not scorer:
            raise ValueError(f"Failed to load scorer plugin: {scorer_plugin_id}:{scorer_entrypoint}")

        # Invoke scorer with timeout protection
        timeout_ms = ctx.get("timeout_ms", 5000)
        try:
            # TODO: Add timeout enforcement using threading.Timer or signal.alarm
            result = scorer.score(metrics, config or {}, ctx)
            if not isinstance(result, dict) or "score" not in result:
                raise ValueError("Scorer must return a dict with 'score' key")
            return result
        except Exception as e:
            logger.error(f"Scorer plugin {scorer_plugin_id} failed: {e}", exc_info=True)
            raise ValueError(f"Scorer plugin execution failed: {e}")

    @classmethod
    def _load_plugin(cls, plugin_id: str, entrypoint: str) -> Any:
        """
        Load a scorer plugin by entrypoint.

        Args:
            plugin_id: Plugin identifier for caching
            entrypoint: Python path like 'pkg.module:ClassName'

        Returns:
            Scorer instance or None if loading fails
        """
        cache_key = f"{plugin_id}:{entrypoint}"
        if cache_key in cls._plugin_cache:
            return cls._plugin_cache[cache_key]

        try:
            # Parse entrypoint: 'pkg.module:ClassName'
            if ":" not in entrypoint:
                raise ValueError(f"Invalid entrypoint format: {entrypoint}. Expected 'module:ClassName'")

            module_path, class_name = entrypoint.split(":", 1)

            # Dynamic import
            import importlib

            module = importlib.import_module(module_path)
            scorer_class = getattr(module, class_name)

            # Instantiate
            scorer = scorer_class()

            # Cache it
            cls._plugin_cache[cache_key] = scorer
            logger.info(f"Loaded scorer plugin: {plugin_id} from {entrypoint}")
            return scorer

        except Exception as e:
            logger.error(f"Failed to load scorer plugin {plugin_id}:{entrypoint}: {e}", exc_info=True)
            return None

    @classmethod
    def clear_cache(cls) -> None:
        """Clear the plugin cache (useful for testing)."""
        cls._plugin_cache.clear()
