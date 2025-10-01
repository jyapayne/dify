from __future__ import annotations

from types import SimpleNamespace

from services.red_blue_service import RedBlueService


def test_submit_prompt_creates_submission(mocker):
    session = mocker.MagicMock()
    sub = RedBlueService.submit_prompt(
        challenge_id="cid",
        tenant_id="tid",
        team="red",
        prompt="attack",
        account_id="aid",
        end_user_id="eid",
        session=session,
    )
    assert sub.team == "red"
    session.add.assert_called_once()
    session.commit.assert_called_once()


def test_select_counterparty_submission_latest_active(mocker):
    c = SimpleNamespace(id="cid")
    session = mocker.MagicMock()
    qs = (
        session.query.return_value.filter.return_value.order_by.return_value
    )
    qs.first.return_value = SimpleNamespace(id="subid", team="blue")
    sub = RedBlueService.select_counterparty_submission(challenge=c, team="red", session=session)
    assert sub.team == "blue"


