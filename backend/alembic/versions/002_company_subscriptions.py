"""Add company_subscriptions table for Stripe billing persistence.

Revision ID: 002
Revises: 001
Create Date: 2026-05-20
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "company_subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "company_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("companies.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("plan_id", sa.String(32), server_default="start", nullable=False),
        sa.Column("status", sa.String(32), server_default="active", nullable=False),
        sa.Column("stripe_customer_id", sa.String(255), nullable=True),
        sa.Column("stripe_subscription_id", sa.String(255), nullable=True),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancel_at_period_end", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("trial_ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("company_id", name="uq_company_subscriptions_company_id"),
    )
    op.create_index("ix_company_subscriptions_company_id", "company_subscriptions", ["company_id"])
    op.create_index("ix_company_subscriptions_stripe_customer_id", "company_subscriptions", ["stripe_customer_id"])


def downgrade() -> None:
    op.drop_index("ix_company_subscriptions_stripe_customer_id", table_name="company_subscriptions")
    op.drop_index("ix_company_subscriptions_company_id", table_name="company_subscriptions")
    op.drop_table("company_subscriptions")
