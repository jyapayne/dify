from __future__ import annotations

from flask_restx import Resource

from controllers.web import web_ns
from extensions.ext_database import db
from sqlalchemy import select

from models.challenge import Challenge, ChallengeAttempt
from models.model import App, Site


@web_ns.route("/challenges")
class ChallengeListApi(Resource):
    def get(self):
        q = db.session.query(Challenge).filter(Challenge.is_active.is_(True)).order_by(Challenge.created_at.desc())
        items = []
        for c in q.all():
            app = db.session.get(App, c.app_id) if c.app_id else None
            site_code = None
            if c.app_id:
                site = db.session.execute(
                    select(Site).where(Site.app_id == c.app_id, Site.status == "normal")
                ).scalar_one_or_none()
                site_code = site.code if site else None
            items.append({
                "id": c.id,
                "name": c.name,
                "description": c.description,
                "goal": c.goal,
                "app_id": c.app_id,
                "workflow_id": c.workflow_id,
                "app_mode": app.mode if app else None,
                "app_site_code": site_code,
            })
        return {"result": "success", "data": items}


@web_ns.route("/challenges/<uuid:challenge_id>")
class ChallengeDetailApi(Resource):
    def get(self, challenge_id):
        c = db.session.get(Challenge, str(challenge_id))
        if not c:
            return {"result": "not_found"}, 404

        app = db.session.get(App, c.app_id) if c.app_id else None
        site_code = None
        if c.app_id:
            site = db.session.execute(
                select(Site).where(Site.app_id == c.app_id, Site.status == "normal")
            ).scalar_one_or_none()
            site_code = site.code if site else None
        data = {
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "goal": c.goal,
            "is_active": c.is_active,
            "app_id": c.app_id,
            "workflow_id": c.workflow_id,
            "app_mode": app.mode if app else None,
            "app_site_code": site_code,
        }
        return {"result": "success", "data": data}


@web_ns.route("/challenges/<uuid:challenge_id>/leaderboard")
class ChallengeLeaderboardApi(Resource):
    def get(self, challenge_id):
        limit = 20

        # Get the challenge to determine scoring strategy
        challenge = db.session.get(Challenge, str(challenge_id))
        if not challenge:
            return {"result": "not_found"}, 404

        scoring_strategy = challenge.scoring_strategy or 'highest_rating'

        # Build query based on scoring strategy
        q = db.session.query(ChallengeAttempt).filter(
            ChallengeAttempt.challenge_id == str(challenge_id),
            ChallengeAttempt.succeeded.is_(True)
        )

        # Apply sorting based on strategy
        if scoring_strategy == 'first':
            # Earliest successful attempt wins
            q = q.order_by(ChallengeAttempt.created_at.asc())
        elif scoring_strategy == 'fastest':
            # Lowest elapsed_ms wins
            q = q.order_by(ChallengeAttempt.elapsed_ms.asc().nullslast(), ChallengeAttempt.created_at.asc())
        elif scoring_strategy == 'fewest_tokens':
            # Lowest tokens_total wins
            q = q.order_by(ChallengeAttempt.tokens_total.asc().nullslast(), ChallengeAttempt.created_at.asc())
        elif scoring_strategy == 'highest_rating':
            # Highest judge_rating wins, ties broken by earliest
            q = q.order_by(ChallengeAttempt.judge_rating.desc().nullslast(), ChallengeAttempt.created_at.asc())
        elif scoring_strategy == 'custom':
            # Custom score field (computed by plugin)
            q = q.order_by(ChallengeAttempt.score.desc().nullslast(), ChallengeAttempt.created_at.asc())
        else:
            # Default to highest_rating
            q = q.order_by(ChallengeAttempt.judge_rating.desc().nullslast(), ChallengeAttempt.created_at.asc())

        rows = q.limit(limit).all()
        data = [
            {
                "attempt_id": r.id,
                "account_id": r.account_id,
                "end_user_id": r.end_user_id,
                "score": r.score,
                "judge_rating": r.judge_rating,
                "tokens_total": r.tokens_total,
                "elapsed_ms": r.elapsed_ms,
                "created_at": r.created_at.isoformat() if hasattr(r.created_at, "isoformat") else None,
            }
            for r in rows
        ]
        return {"result": "success", "data": data}


