from __future__ import annotations

from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base
from .types import StringUUID


class Challenge(Base):
    __tablename__ = "challenges"
    __table_args__ = (
        sa.PrimaryKeyConstraint("id", name="challenges_pkey"),
        sa.Index("challenges_tenant_id_idx", "tenant_id"),
        sa.Index("challenges_app_id_idx", "app_id"),
    )

    id: Mapped[str] = mapped_column(StringUUID, server_default=sa.text("uuid_generate_v4()"))
    tenant_id: Mapped[str] = mapped_column(StringUUID, nullable=False)
    app_id: Mapped[str] = mapped_column(StringUUID, nullable=False)
    workflow_id: Mapped[str | None] = mapped_column(StringUUID, nullable=True)

    name: Mapped[str] = mapped_column(sa.Text, nullable=False)
    description: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    goal: Mapped[str | None] = mapped_column(sa.Text, nullable=True)

    success_type: Mapped[str] = mapped_column(sa.String(64), nullable=False, server_default=sa.text("'regex'"))
    success_pattern: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    secret_ref: Mapped[str | None] = mapped_column(sa.Text, nullable=True)

    evaluator_type: Mapped[str] = mapped_column(sa.String(32), nullable=False, server_default=sa.text("'rules'"))
    evaluator_plugin_id: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    evaluator_entrypoint: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    evaluator_config = mapped_column(JSONB, nullable=True)

    scoring_strategy: Mapped[str] = mapped_column(sa.String(64), nullable=False, server_default=sa.text("'first'"))
    scoring_plugin_id: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    scoring_entrypoint: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    scoring_config = mapped_column(JSONB, nullable=True)

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


class ChallengeAttempt(Base):
    __tablename__ = "challenge_attempts"
    __table_args__ = (
        sa.PrimaryKeyConstraint("id", name="challenge_attempts_pkey"),
        sa.Index("challenge_attempts_tenant_id_idx", "tenant_id"),
        sa.Index("challenge_attempts_challenge_id_idx", "challenge_id"),
    )

    id: Mapped[str] = mapped_column(StringUUID, server_default=sa.text("uuid_generate_v4()"))
    tenant_id: Mapped[str] = mapped_column(StringUUID, nullable=False)
    challenge_id: Mapped[str] = mapped_column(StringUUID, nullable=False)

    end_user_id: Mapped[str | None] = mapped_column(StringUUID, nullable=True)
    account_id: Mapped[str | None] = mapped_column(StringUUID, nullable=True)
    workflow_run_id: Mapped[str | None] = mapped_column(StringUUID, nullable=True)

    succeeded: Mapped[bool] = mapped_column(sa.Boolean, nullable=False, server_default=sa.text("false"))
    score: Mapped[float | None] = mapped_column(sa.Float, nullable=True)

    judge_rating: Mapped[int | None] = mapped_column(sa.Integer, nullable=True)
    judge_feedback: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    judge_output_raw = mapped_column(JSONB, nullable=True)

    tokens_total: Mapped[int | None] = mapped_column(sa.Integer, nullable=True)
    elapsed_ms: Mapped[int | None] = mapped_column(sa.Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime,
        nullable=False,
        server_default=sa.func.current_timestamp(),
    )

