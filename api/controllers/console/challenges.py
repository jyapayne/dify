from __future__ import annotations

from flask_restx import Resource, reqparse

from controllers.console import console_ns as api
from controllers.console.wraps import (
    account_initialization_required,
    setup_required,
)
from libs.login import login_required
from extensions.ext_database import db
from libs.login import current_user
from models.challenge import Challenge


@api.route("/challenges")
class ChallengeListCreateApi(Resource):
    @api.doc("list_challenges")
    @setup_required
    @login_required
    @account_initialization_required
    def get(self):
        tenant_id = current_user.current_tenant_id
        if not tenant_id:
            # no active workspace selected; return empty list to avoid leaking data
            return {"result": "success", "data": []}
        rows = (
            db.session.query(Challenge)
            .filter(Challenge.tenant_id == tenant_id)
            .order_by(Challenge.created_at.desc())
            .all()
        )
        return {
            "result": "success",
            "data": [
                {
                    "id": r.id,
                    "name": r.name,
                    "description": r.description,
                    "goal": r.goal,
                    "is_active": r.is_active,
                    "success_type": r.success_type,
                    "success_pattern": r.success_pattern,
                    "scoring_strategy": r.scoring_strategy,
                    "app_id": r.app_id,
                    "workflow_id": r.workflow_id,
                }
                for r in rows
            ],
        }

    @api.doc("create_challenge")
    @setup_required
    @login_required
    @account_initialization_required
    def post(self):
        parser = reqparse.RequestParser()
        parser.add_argument("tenant_id", type=str, required=False, location="json")
        parser.add_argument("app_id", type=str, required=True, location="json")
        parser.add_argument("workflow_id", type=str, required=False, location="json")
        parser.add_argument("name", type=str, required=True, location="json")
        parser.add_argument("description", type=str, required=False, location="json")
        parser.add_argument("goal", type=str, required=False, location="json")
        parser.add_argument("success_type", type=str, required=False, location="json")
        parser.add_argument("success_pattern", type=str, required=False, location="json")
        parser.add_argument("scoring_strategy", type=str, required=False, location="json")
        parser.add_argument("is_active", type=bool, required=False, location="json")
        args = parser.parse_args()

        c = Challenge()
        c.tenant_id = args.get("tenant_id") or current_user.current_tenant_id
        c.app_id = args["app_id"]
        # Convert empty string to None for UUID field
        workflow_id = args.get("workflow_id")
        c.workflow_id = workflow_id if workflow_id else None
        c.name = args["name"]
        c.description = args.get("description")
        c.goal = args.get("goal")
        if args.get("success_type"):
            c.success_type = args["success_type"]
        c.success_pattern = args.get("success_pattern")
        if args.get("scoring_strategy"):
            c.scoring_strategy = args["scoring_strategy"]
        if args.get("is_active") is not None:
            c.is_active = args["is_active"]
        db.session.add(c)
        db.session.commit()
        return {"result": "success", "data": {"id": c.id}}, 201


@api.route("/challenges/<uuid:challenge_id>")
class ChallengeDetailApi(Resource):
    @api.doc("get_challenge")
    @setup_required
    @login_required
    @account_initialization_required
    def get(self, challenge_id):
        c = db.session.get(Challenge, str(challenge_id))
        if not c:
            return {"result": "not_found"}, 404
        return {
            "result": "success",
            "data": {
                "id": c.id,
                "name": c.name,
                "description": c.description,
                "goal": c.goal,
                "is_active": c.is_active,
                "success_type": c.success_type,
                "success_pattern": c.success_pattern,
                "scoring_strategy": c.scoring_strategy,
                "app_id": c.app_id,
                "workflow_id": c.workflow_id,
            },
        }

    @api.doc("update_challenge")
    @setup_required
    @login_required
    @account_initialization_required
    def patch(self, challenge_id):
        c = db.session.get(Challenge, str(challenge_id))
        if not c:
            return {"result": "not_found"}, 404
        parser = reqparse.RequestParser()
        parser.add_argument("name", type=str, required=False, location="json")
        parser.add_argument("description", type=str, required=False, location="json")
        parser.add_argument("goal", type=str, required=False, location="json")
        parser.add_argument("is_active", type=bool, required=False, location="json")
        args = parser.parse_args()
        if args.get("name"):
            c.name = args["name"]
        if args.get("description") is not None:
            c.description = args["description"]
        if args.get("goal") is not None:
            c.goal = args["goal"]
        if args.get("is_active") is not None:
            c.is_active = bool(args["is_active"])
        db.session.commit()
        return {"result": "success"}

    @api.doc("delete_challenge")
    @setup_required
    @login_required
    @account_initialization_required
    def delete(self, challenge_id):
        c = db.session.get(Challenge, str(challenge_id))
        if not c:
            return {"result": "not_found"}, 404
        db.session.delete(c)
        db.session.commit()
        return {"result": "success"}, 204


