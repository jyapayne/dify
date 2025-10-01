# Custom Scorer Plugins

This directory contains custom scorer plugins for challenge leaderboards.

## Overview

Scorers compute numeric scores from challenge attempt metrics (tokens, time, rating, success) for ranking on leaderboards when `scoring_strategy = 'custom'`.

## Built-in Scorers

### WeightedScorer

**Entrypoint:** `services.scorers.weighted:WeightedScorer`

Computes a weighted score combining multiple metrics with configurable bonuses and penalties.

**Formula:**
```
score = success_bonus
        + (rating × rating_weight)
        - (elapsed_seconds × time_penalty)
        - (tokens × token_penalty)
```

**Configuration:**
- `success_bonus` (float, default: 100): Base points for successful attempts
- `rating_weight` (float, default: 10): Multiplier for judge rating (0-10)
- `time_penalty` (float, default: 1.0): Penalty per second elapsed
- `token_penalty` (float, default: 0.01): Penalty per token used

**Example Configuration:**
```json
{
  "success_bonus": 100.0,
  "rating_weight": 10.0,
  "time_penalty": 1.0,
  "token_penalty": 0.01
}
```

**Example Challenge Setup (via API):**
```python
{
  "name": "Advanced Prompt Challenge",
  "scoring_strategy": "custom",
  "scoring_plugin_id": "builtin.weighted_scorer",
  "scoring_entrypoint": "services.scorers.weighted:WeightedScorer",
  "scoring_config": {
    "success_bonus": 100.0,
    "rating_weight": 15.0,
    "time_penalty": 0.5,
    "token_penalty": 0.02
  }
}
```

## Creating Custom Scorers

### 1. Implement the ScorerProtocol

Create a new file in this directory (e.g., `custom.py`):

```python
from typing import Any
from services.challenge_scorer_protocol import AttemptMetrics, ScoringContext, ScoringResult

class MyCustomScorer:
    def score(self, metrics: AttemptMetrics, config: dict[str, Any], ctx: ScoringContext) -> ScoringResult:
        # Access metrics
        succeeded = metrics.get('succeeded', False)
        tokens = metrics.get('tokens_total', 0)
        elapsed_ms = metrics.get('elapsed_ms', 0)
        rating = metrics.get('rating', 0)

        # Access configuration
        multiplier = config.get('multiplier', 1.0)

        # Compute score
        score = (rating * multiplier) if succeeded else 0.0

        return {
            'score': score,
            'details': {  # optional
                'multiplier_used': multiplier
            }
        }
```

### 2. Register in Challenge

Set the challenge's scoring fields:

```python
challenge.scoring_strategy = 'custom'
challenge.scoring_plugin_id = 'my_custom_scorer'
challenge.scoring_entrypoint = 'services.scorers.custom:MyCustomScorer'
challenge.scoring_config = {
    'multiplier': 2.0
}
```

### 3. Testing

Create tests in `api/tests/unit_tests/services/` following the pattern in `test_challenge_scorer_service.py`.

## Protocol Reference

### Input Types

**AttemptMetrics:**
- `succeeded` (bool): Whether the challenge was passed
- `tokens_total` (int | None): Total tokens used
- `elapsed_ms` (int | None): Time taken in milliseconds
- `rating` (int | None): Judge rating (0-10)
- `created_at` (int | None): Timestamp in epoch milliseconds

**ScoringContext:**
- `tenant_id` (str): Tenant identifier
- `app_id` (str): Application identifier
- `workflow_id` (str): Workflow identifier
- `challenge_id` (str): Challenge identifier
- `end_user_id` (str | None): End user identifier (if available)
- `timeout_ms` (int): Maximum execution time

### Output Type

**ScoringResult:**
- `score` (float, required): Computed numeric score
- `details` (dict[str, Any] | None, optional): Additional scoring details

## Error Handling

- Scorers must return a dict with a `score` key
- Exceptions are caught and logged; the attempt is recorded with `score=None`
- Scorers are executed with a timeout (default: 5s)
- Scorers should never return negative scores; use `max(score, 0.0)` to clamp

## Best Practices

1. **Keep it simple**: Scoring should be fast and deterministic
2. **Validate config**: Check configuration values and provide defaults
3. **Clamp scores**: Ensure scores are non-negative
4. **Document formula**: Clearly explain how your scorer works
5. **Test edge cases**: Test with missing metrics, zeros, nulls
