"""Add email verification fields to users.

Revision ID: 004
Revises: 003
Create Date: 2026-05-20
"""
from alembic import op
import sqlalchemy as sa

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("email_verification_token_hash", sa.String(64), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "email_verification_token_hash")
    op.drop_column("users", "email_verified_at")
