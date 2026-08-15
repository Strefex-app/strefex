"""Store refresh token jti so rotation and logout can revoke prior tokens.

Revision ID: 007
Revises: 006
Create Date: 2026-08-15
"""
from alembic import op
import sqlalchemy as sa

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("refresh_token_jti", sa.String(length=64), nullable=True),
    )
    op.create_index("ix_users_refresh_token_jti", "users", ["refresh_token_jti"])


def downgrade() -> None:
    op.drop_index("ix_users_refresh_token_jti", table_name="users")
    op.drop_column("users", "refresh_token_jti")
