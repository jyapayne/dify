from __future__ import annotations

from flask import request
from flask_restx import Resource

from controllers.web import web_ns
from extensions.ext_database import db
from services.account_service import RegisterService


@web_ns.route('/register')
class WebRegisterApi(Resource):
    def post(self):
        payload = request.get_json(force=True) or {}
        email = payload.get('email')
        name = payload.get('name') or 'Player'
        password = payload.get('password')
        if not email or not password:
            return {'result': 'bad_request'}, 400
        account = RegisterService.register(
            email=email,
            name=name,
            password=password,
            is_setup=False,
            create_workspace_required=False,
        )
        db.session.commit()
        return {'result': 'success', 'data': {'account_id': account.id}}, 201


