from __future__ import annotations

from flask_restx import Resource, reqparse

from controllers.console import console_ns as api
from controllers.console.wraps import (
    account_initialization_required,
    setup_required,
)
from extensions.ext_database import db
from libs.login import current_user, login_required
from models.red_blue import RedBlueChallenge, TeamPairing


@api.route("/red-blue-challenges")
class RedBlueListCreateApi(Resource):
    @api.doc("list_red_blue_challenges")
    @setup_required
    @login_required
    @account_initialization_required
    def get(self):
        tenant_id = current_user.current_tenant_id
        if not tenant_id:
            return {"result": "success", "data": []}
        rows = (
            db.session.query(RedBlueChallenge)
            .filter(RedBlueChallenge.tenant_id == tenant_id)
            .order_by(RedBlueChallenge.created_at.desc())
            .all()
        )
        return {
            "result": "success",
            "data": [
                {
                    "id": r.id,
                    "name": r.name,
                    "description": r.description,
                    "is_active": r.is_active,
                }
                for r in rows
            ],
        }

    @api.doc("create_red_blue_challenge")
    @setup_required
    @login_required
    @account_initialization_required
    def post(self):
        parser = reqparse.RequestParser()
        parser.add_argument("tenant_id", type=str, required=True, location="json")
        parser.add_argument("app_id", type=str, required=True, location="json")
        parser.add_argument("name", type=str, required=True, location="json")
        parser.add_argument("description", type=str, required=False, location="json")
        parser.add_argument("judge_suite", type=dict, required=True, location="json")
        args = parser.parse_args()

        c = RedBlueChallenge()
        c.tenant_id = args.get("tenant_id") or current_user.current_tenant_id
        c.app_id = args["app_id"]
        c.name = args["name"]
        c.description = args.get("description")
        c.judge_suite = args["judge_suite"]
        db.session.add(c)
        db.session.commit()
        return {"result": "success", "data": {"id": c.id}}, 201


@api.route("/red-blue-challenges/<uuid:challenge_id>")
class RedBlueDetailApi(Resource):
    @api.doc("get_red_blue_challenge")
    @setup_required
    @login_required
    @account_initialization_required
    def get(self, challenge_id):
        c = db.session.get(RedBlueChallenge, str(challenge_id))
        if not c:
            return {"result": "not_found"}, 404
        return {
            "result": "success",
            "data": {"id": c.id, "name": c.name, "description": c.description, "is_active": c.is_active},
        }

    @api.doc("update_red_blue_challenge")
    @setup_required
    @login_required
    @account_initialization_required
    def patch(self, challenge_id):
        c = db.session.get(RedBlueChallenge, str(challenge_id))
        if not c:
            return {"result": "not_found"}, 404
        parser = reqparse.RequestParser()
        parser.add_argument("name", type=str, required=False, location="json")
        parser.add_argument("description", type=str, required=False, location="json")
        parser.add_argument("is_active", type=bool, required=False, location="json")
        args = parser.parse_args()
        if args.get("name"):
            c.name = args["name"]
        if args.get("description") is not None:
            c.description = args["description"]
        if args.get("is_active") is not None:
            c.is_active = bool(args["is_active"])
        db.session.commit()
        return {"result": "success"}

    @api.doc("delete_red_blue_challenge")
    @setup_required
    @login_required
    @account_initialization_required
    def delete(self, challenge_id):
        c = db.session.get(RedBlueChallenge, str(challenge_id))
        if not c:
            return {"result": "not_found"}, 404
        db.session.delete(c)
        db.session.commit()
        return {"result": "success"}, 204


@api.route("/red-blue-challenges/<uuid:challenge_id>/pairings")
class RedBluePairingsApi(Resource):
    @api.doc("list_red_blue_pairings")
    @setup_required
    @login_required
    @account_initialization_required
    def get(self, challenge_id):
        rows = (
            db.session.query(TeamPairing)
            .filter(TeamPairing.red_blue_challenge_id == str(challenge_id))
            .order_by(TeamPairing.created_at.desc())
            .limit(100)
            .all()
        )
        return {
            "result": "success",
            "data": [
                {
                    "id": r.id,
                    "red_points": r.red_points,
                    "blue_points": r.blue_points,
                    "judge_rating": r.judge_rating,
                    "created_at": r.created_at.isoformat() if hasattr(r.created_at, "isoformat") else None,
                }
                for r in rows
            ],
        }

