from __future__ import annotations

from flask.testing import FlaskClient


class TestWebRedBlueChallenges:
    def test_list(self, test_client_with_containers: FlaskClient):
        resp = test_client_with_containers.get("/api/web/red-blue-challenges")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["result"] == "success"


