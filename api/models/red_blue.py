from __future__ import annotations

from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base
from .types import StringUUID


class RedBlueChallenge(Base):
    __tablename__ = "red_blue_challenges"
    __table_args__ = (
        sa.PrimaryKeyConstraint("id", name="red_blue_challenges_pkey"),
        sa.Index("red_blue_challenges_tenant_id_idx", "tenant_id"),
        sa.Index("red_blue_challenges_app_id_idx", "app_id"),
    )

    id: Mapped[str] = mapped_column(StringUUID, server_default=sa.text("uuid_generate_v4()"))
    tenant_id: Mapped[str] = mapped_column(StringUUID, nullable=False)
    app_id: Mapped[str] = mapped_column(StringUUID, nullable=False)
    workflow_id: Mapped[str | None] = mapped_column(StringUUID, nullable=True)

    name: Mapped[str] = mapped_column(sa.Text, nullable=False)
    description: Mapped[str | None] = mapped_column(sa.Text, nullable=True)

    judge_suite = mapped_column(JSONB, nullable=False)
    defense_selection_policy: Mapped[str] = mapped_column(
        sa.String(64), nullable=False, server_default=sa.text("'latest_best'")
    )
    attack_selection_policy: Mapped[str] = mapped_column(
        sa.String(64), nullable=False, server_default=sa.text("'latest_best'")
    )
    scoring_strategy: Mapped[str] = mapped_column(
        sa.String(64), nullable=False, server_default=sa.text("'red_blue_ratio'")
    )

    theme = mapped_column(JSONB, nullable=True)
    instructions_md: Mapped[str | None] = mapped_column(sa.Text, nullable=True)

    is_active: Mapped[bool] = mapped_column(sa.Boolean, nullable=False, server_default=sa.text("true"))

    created_by: Mapped[str | None] = mapped_column(StringUUID, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime,
        nullable=False,
        server_default=sa.func.current_timestamp(),
    )
    updated_by: Mapped[str | None] = mapped_column(StringUUID, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        sa.DateTime,
        nullable=False,
        server_default=sa.func.current_timestamp(),
    )


class TeamSubmission(Base):
    __tablename__ = "team_submissions"
    __table_args__ = (
        sa.PrimaryKeyConstraint("id", name="team_submissions_pkey"),
        sa.Index("team_submissions_challenge_id_idx", "red_blue_challenge_id"),
        sa.Index("team_submissions_tenant_id_idx", "tenant_id"),
    )

    id: Mapped[str] = mapped_column(StringUUID, server_default=sa.text("uuid_generate_v4()"))
    red_blue_challenge_id: Mapped[str] = mapped_column(StringUUID, nullable=False)
    tenant_id: Mapped[str] = mapped_column(StringUUID, nullable=False)
    account_id: Mapped[str | None] = mapped_column(StringUUID, nullable=True)
    end_user_id: Mapped[str | None] = mapped_column(StringUUID, nullable=True)

    team: Mapped[str] = mapped_column(sa.String(16), nullable=False)  # 'red' | 'blue'
    prompt: Mapped[str] = mapped_column(sa.Text, nullable=False)
    active: Mapped[bool] = mapped_column(sa.Boolean, nullable=False, server_default=sa.text("true"))

    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime,
        nullable=False,
        server_default=sa.func.current_timestamp(),
    )


class TeamPairing(Base):
    __tablename__ = "team_pairings"
    __table_args__ = (
        sa.PrimaryKeyConstraint("id", name="team_pairings_pkey"),
        sa.Index("team_pairings_challenge_id_idx", "red_blue_challenge_id"),
        sa.Index("team_pairings_tenant_id_idx", "tenant_id"),
    )

    id: Mapped[str] = mapped_column(StringUUID, server_default=sa.text("uuid_generate_v4()"))
    red_blue_challenge_id: Mapped[str] = mapped_column(StringUUID, nullable=False)
    tenant_id: Mapped[str] = mapped_column(StringUUID, nullable=False)

    attack_submission_id: Mapped[str | None] = mapped_column(StringUUID, nullable=True)
    defense_submission_id: Mapped[str | None] = mapped_column(StringUUID, nullable=True)

    judge_output_raw = mapped_column(JSONB, nullable=True)
    categories = mapped_column(JSONB, nullable=True)
    judge_rating: Mapped[int | None] = mapped_column(sa.Integer, nullable=True)
    judge_feedback: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    red_points: Mapped[float] = mapped_column(sa.Float, nullable=False, server_default=sa.text("0"))
    blue_points: Mapped[float] = mapped_column(sa.Float, nullable=False, server_default=sa.text("0"))

    tokens_total: Mapped[int | None] = mapped_column(sa.Integer, nullable=True)
    elapsed_ms: Mapped[int | None] = mapped_column(sa.Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime,
        nullable=False,
        server_default=sa.func.current_timestamp(),
    )

