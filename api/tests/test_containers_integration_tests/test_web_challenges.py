from __future__ import annotations

from flask.testing import FlaskClient


class TestWebChallenges:
    def test_list_and_detail(self, test_client_with_containers: FlaskClient):
        # list
        resp = test_client_with_containers.get("/api/web/challenges")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["result"] == "success"


