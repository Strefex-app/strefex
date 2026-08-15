"""Tenant list indexes for projects and assets.

Revision ID: 008
Revises: 007
Create Date: 2026-08-15
"""
from alembic import op

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_projects_company_id ON projects (company_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_projects_company_id_created_at "
        "ON projects (company_id, created_at DESC)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_assets_company_id ON assets (company_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_assets_company_id_created_at "
        "ON assets (company_id, created_at DESC)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_assets_company_id_created_at")
    op.execute("DROP INDEX IF EXISTS ix_assets_company_id")
    op.execute("DROP INDEX IF EXISTS ix_projects_company_id_created_at")
    op.execute("DROP INDEX IF EXISTS ix_projects_company_id")
