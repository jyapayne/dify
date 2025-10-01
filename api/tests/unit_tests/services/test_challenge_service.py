from __future__ import annotations

from models.challenge import ChallengeAttempt
from services.challenge_service import ChallengeService


def test_evaluate_outcome_regex_match():
    ok, details = ChallengeService.evaluate_outcome(
        "Hello SECRET",
        {"success_type": "regex", "success_pattern": "secret"},
    )
    assert ok is True
    assert details.get("mode") == "regex"


def test_evaluate_outcome_contains():
    ok, _ = ChallengeService.evaluate_outcome(
        "hello world",
        {"success_type": "contains", "success_pattern": "world"},
    )
    assert ok is True


def test_record_attempt_creates_row(mocker):
    # mock db.session
    session = mocker.MagicMock()
    attempt = ChallengeService.record_attempt(
        tenant_id="t1",
        challenge_id="c1",
        end_user_id=None,
        account_id=None,
        workflow_run_id=None,
        succeeded=True,
        score=10.0,
        session=session,
    )
    assert isinstance(attempt, ChallengeAttempt)
    session.add.assert_called_once()
    session.commit.assert_called_once()

