from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from extensions.ext_database import db
from models.red_blue import RedBlueChallenge, TeamPairing, TeamSubmission


class RedBlueService:
    @staticmethod
    def submit_prompt(
        *,
        challenge_id: str,
        tenant_id: str,
        team: str,
        prompt: str,
        account_id: str | None,
        end_user_id: str | None,
        session: Session | None = None,
    ) -> TeamSubmission:
        sess = session or db.session
        sub = TeamSubmission()
        sub.red_blue_challenge_id = challenge_id
        sub.tenant_id = tenant_id
        sub.team = team
        sub.prompt = prompt
        sub.account_id = account_id
        sub.end_user_id = end_user_id
        sess.add(sub)
        sess.commit()
        return sub

    @staticmethod
    def select_counterparty_submission(
        *,
        challenge: RedBlueChallenge,
        team: str,
        session: Session | None = None,
    ) -> TeamSubmission | None:
        sess = session or db.session
        opposite = "blue" if team == "red" else "red"
        # Simplest policy: latest active from opposite team
        return (
            sess.query(TeamSubmission)
            .filter(
                TeamSubmission.red_blue_challenge_id == challenge.id,
                TeamSubmission.team == opposite,
                TeamSubmission.active.is_(True),
            )
            .order_by(TeamSubmission.created_at.desc())
            .first()
        )

    @staticmethod
    def record_pairing(
        *,
        challenge_id: str,
        tenant_id: str,
        attack_submission_id: str | None,
        defense_submission_id: str | None,
        judge_output_raw: dict[str, Any] | None,
        categories: dict[str, Any] | None,
        judge_rating: int | None,
        judge_feedback: str | None,
        red_points: float,
        blue_points: float,
        tokens_total: int | None,
        elapsed_ms: int | None,
        session: Session | None = None,
    ) -> TeamPairing:
        sess = session or db.session
        pairing = TeamPairing()
        pairing.red_blue_challenge_id = challenge_id
        pairing.tenant_id = tenant_id
        pairing.attack_submission_id = attack_submission_id
        pairing.defense_submission_id = defense_submission_id
        pairing.judge_output_raw = judge_output_raw
        pairing.categories = categories
        pairing.judge_rating = judge_rating
        pairing.judge_feedback = judge_feedback
        pairing.red_points = red_points
        pairing.blue_points = blue_points
        pairing.tokens_total = tokens_total
        pairing.elapsed_ms = elapsed_ms
        sess.add(pairing)
        sess.commit()
        return pairing


