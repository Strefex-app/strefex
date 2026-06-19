"""Drop legacy tenants table — companies is the sole tenant model.

Revision ID: 003
Revises: 002
Create Date: 2026-05-20

Migrates any tenant rows whose slug is not yet in companies, then drops tenants.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if "tenants" not in inspector.get_table_names():
        return

    op.execute(
        """
        INSERT INTO companies (id, name, slug, is_active, created_at, updated_at)
        SELECT t.id, t.name, t.slug, t.is_active, t.created_at, t.updated_at
        FROM tenants t
        WHERE NOT EXISTS (
            SELECT 1 FROM companies c WHERE c.slug = t.slug
        )
        """
    )
    op.drop_table("tenants")


def downgrade() -> None:
    op.create_table(
        "tenants",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(100), unique=True, nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
