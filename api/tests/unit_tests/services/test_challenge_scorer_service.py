"""Tests for ChallengeScorerService."""

from __future__ import annotations

import pytest

from services.challenge_scorer_service import ChallengeScorerService


class TestChallengeScorerService:
    """Test custom scorer plugin loading and execution."""

    def test_weighted_scorer_success(self):
        """Test WeightedScorer with successful attempt."""
        metrics = {
            "succeeded": True,
            "tokens_total": 1000,
            "elapsed_ms": 5000,  # 5 seconds
            "rating": 8,
            "created_at": 1730000000000,
        }

        config = {
            "success_bonus": 100.0,
            "rating_weight": 10.0,
            "time_penalty": 1.0,
            "token_penalty": 0.01,
        }

        ctx = {
            "tenant_id": "test-tenant",
            "app_id": "test-app",
            "workflow_id": "test-workflow",
            "challenge_id": "test-challenge",
            "timeout_ms": 5000,
        }

        result = ChallengeScorerService.score_with_plugin(
            scorer_plugin_id="builtin.weighted_scorer",
            scorer_entrypoint="services.scorers.weighted:WeightedScorer",
            metrics=metrics,
            config=config,
            ctx=ctx,
        )

        # Expected: 100 (success) + 80 (8*10 rating) - 5 (5s*1.0) - 10 (1000*0.01) = 165
        assert result["score"] == 165.0
        assert "details" in result
        assert result["details"]["base"] == 100.0
        assert result["details"]["rating_contribution"] == 80.0
        assert result["details"]["time_penalty"] == 5.0
        assert result["details"]["token_penalty"] == 10.0

    def test_weighted_scorer_failure(self):
        """Test WeightedScorer with failed attempt."""
        metrics = {
            "succeeded": False,
            "tokens_total": 500,
            "elapsed_ms": 2000,  # 2 seconds
            "rating": 3,
            "created_at": 1730000000000,
        }

        config = {
            "success_bonus": 100.0,
            "rating_weight": 10.0,
            "time_penalty": 1.0,
            "token_penalty": 0.01,
        }

        ctx = {
            "tenant_id": "test-tenant",
            "app_id": "test-app",
            "challenge_id": "test-challenge",
            "timeout_ms": 5000,
        }

        result = ChallengeScorerService.score_with_plugin(
            scorer_plugin_id="builtin.weighted_scorer",
            scorer_entrypoint="services.scorers.weighted:WeightedScorer",
            metrics=metrics,
            config=config,
            ctx=ctx,
        )

        # Expected: 0 (no success bonus) + 30 (3*10) - 2 (2s*1.0) - 5 (500*0.01) = 23
        assert result["score"] == 23.0

    def test_weighted_scorer_minimum_zero(self):
        """Test WeightedScorer never returns negative scores."""
        metrics = {
            "succeeded": False,
            "tokens_total": 10000,  # High token count
            "elapsed_ms": 30000,  # 30 seconds
            "rating": 1,
            "created_at": 1730000000000,
        }

        config = {
            "success_bonus": 100.0,
            "rating_weight": 10.0,
            "time_penalty": 1.0,
            "token_penalty": 0.01,
        }

        ctx = {
            "tenant_id": "test-tenant",
            "app_id": "test-app",
            "challenge_id": "test-challenge",
            "timeout_ms": 5000,
        }

        result = ChallengeScorerService.score_with_plugin(
            scorer_plugin_id="builtin.weighted_scorer",
            scorer_entrypoint="services.scorers.weighted:WeightedScorer",
            metrics=metrics,
            config=config,
            ctx=ctx,
        )

        # Expected: 0 + 10 - 30 - 100 = -120, but clamped to 0
        assert result["score"] == 0.0

    def test_scorer_with_missing_plugin(self):
        """Test error handling for missing plugin."""
        with pytest.raises(ValueError, match="Failed to load scorer plugin"):
            ChallengeScorerService.score_with_plugin(
                scorer_plugin_id="nonexistent",
                scorer_entrypoint="nonexistent.module:NonexistentScorer",
                metrics={},
                config={},
                ctx={"timeout_ms": 5000},
            )

    def test_scorer_with_invalid_entrypoint(self):
        """Test error handling for invalid entrypoint format."""
        with pytest.raises(ValueError, match="scorer_plugin_id and scorer_entrypoint are required"):
            ChallengeScorerService.score_with_plugin(
                scorer_plugin_id=None,
                scorer_entrypoint=None,
                metrics={},
                config={},
                ctx={"timeout_ms": 5000},
            )
