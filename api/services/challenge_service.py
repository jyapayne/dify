from __future__ import annotations

import re
from collections.abc import Mapping
from typing import Any

from sqlalchemy.orm import Session

from extensions.ext_database import db
from models.challenge import ChallengeAttempt


class ChallengeService:
    @staticmethod
    def evaluate_outcome(output_text: str, cfg: Mapping[str, Any]) -> tuple[bool, dict[str, Any]]:
        success_type = cfg.get("success_type", "regex")
        pattern = cfg.get("success_pattern")
        if success_type == "regex" and pattern:
            try:
                if re.search(pattern, output_text, flags=re.IGNORECASE | re.MULTILINE):
                    return True, {"mode": "regex", "matched": True}
                return False, {"mode": "regex", "matched": False}
            except re.error as e:
                return False, {"mode": "regex", "error": f"invalid_regex: {e}"}
        if success_type == "contains" and pattern:
            return (pattern.lower() in output_text.lower()), {"mode": "contains"}
        return False, {"mode": success_type, "info": "no_pattern_or_unsupported"}

    @staticmethod
    def record_attempt(
        *,
        tenant_id: str,
        challenge_id: str,
        end_user_id: str | None,
        account_id: str | None,
        workflow_run_id: str | None,
        succeeded: bool,
        score: float | None = None,
        judge_rating: int | None = None,
        judge_feedback: str | None = None,
        judge_output_raw: dict[str, Any] | None = None,
        tokens_total: int | None = None,
        elapsed_ms: int | None = None,
        session: Session | None = None,
    ) -> ChallengeAttempt:
        sess = session or db.session
        attempt = ChallengeAttempt()
        attempt.tenant_id = tenant_id
        attempt.challenge_id = challenge_id
        attempt.end_user_id = end_user_id
        attempt.account_id = account_id
        attempt.workflow_run_id = workflow_run_id
        attempt.succeeded = succeeded
        attempt.score = score
        attempt.judge_rating = judge_rating
        attempt.judge_feedback = judge_feedback
        attempt.judge_output_raw = judge_output_raw
        attempt.tokens_total = tokens_total
        attempt.elapsed_ms = elapsed_ms
        sess.add(attempt)
        sess.commit()
        return attempt


