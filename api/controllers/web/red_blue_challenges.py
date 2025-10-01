from __future__ import annotations

from flask import request
from flask_restx import Resource

from controllers.web import web_ns
from extensions.ext_database import db
from models.red_blue import RedBlueChallenge, TeamPairing
from services.red_blue_service import RedBlueService


@web_ns.route("/red-blue-challenges")
class RedBlueListApi(Resource):
    def get(self):
        q = db.session.query(RedBlueChallenge).filter(RedBlueChallenge.is_active.is_(True))
        items = [
            {
                "id": c.id,
                "name": c.name,
                "description": c.description,
            }
            for c in q.all()
        ]
        return {"result": "success", "data": items}


@web_ns.route("/red-blue-challenges/<uuid:challenge_id>")
class RedBlueDetailApi(Resource):
    def get(self, challenge_id):
        c = db.session.get(RedBlueChallenge, str(challenge_id))
        if not c:
            return {"result": "not_found"}, 404
        data = {
            "id": c.id,
            "name": c.name,
            "description": c.description,
        }
        return {"result": "success", "data": data}


@web_ns.route("/red-blue-challenges/<uuid:challenge_id>/submit")
class RedBlueSubmitApi(Resource):
    def post(self, challenge_id):
        payload = request.get_json(force=True) or {}
        team = payload.get("team")
        prompt = payload.get("prompt")
        if team not in ("red", "blue") or not prompt:
            return {"result": "bad_request"}, 400
        c = db.session.get(RedBlueChallenge, str(challenge_id))
        if not c:
            return {"result": "not_found"}, 404
        sub = RedBlueService.submit_prompt(
            challenge_id=str(challenge_id),
            tenant_id=c.tenant_id,
            team=team,
            prompt=prompt,
            account_id=None,
            end_user_id=None,
        )
        return {"result": "success", "data": {"id": sub.id}}, 201


@web_ns.route("/red-blue-challenges/<uuid:challenge_id>/leaderboard")
class RedBlueLeaderboardApi(Resource):
    def get(self, challenge_id):
        # aggregate simple totals
        red = (
            db.session.query(db.func.coalesce(db.func.sum(TeamPairing.red_points), 0.0))
            .filter(TeamPairing.red_blue_challenge_id == str(challenge_id))
            .scalar()
        )
        blue = (
            db.session.query(db.func.coalesce(db.func.sum(TeamPairing.blue_points), 0.0))
            .filter(TeamPairing.red_blue_challenge_id == str(challenge_id))
            .scalar()
        )
        total = (red or 0.0) + (blue or 0.0)
        data = {
            "red_points": float(red or 0.0),
            "blue_points": float(blue or 0.0),
            "red_ratio": (float(red or 0.0) / total) if total else 0.0,
            "blue_ratio": (float(blue or 0.0) / total) if total else 0.0,
        }
        return {"result": "success", "data": data}

