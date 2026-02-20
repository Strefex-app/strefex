"""Audit model - maps to audits table."""
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import String, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.project import Project
    from app.models.asset import Asset
    from app.models.user import User


class Audit(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "audits"

    company_id: Mapped[PG_UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project_id: Mapped[PG_UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    asset_id: Mapped[PG_UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("assets.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    audit_type: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="scheduled", nullable=False)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    auditor_id: Mapped[PG_UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    findings: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)

    company: Mapped["Company"] = relationship("Company", back_populates="audits", lazy="selectin")
    project: Mapped["Project | None"] = relationship("Project", back_populates="audits", lazy="selectin")
    asset: Mapped["Asset | None"] = relationship("Asset", back_populates="audits", lazy="selectin")
    auditor: Mapped["User | None"] = relationship(
        "User",
        foreign_keys=[auditor_id],
        back_populates="audits_conducted",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Audit {self.audit_type} {self.status}>"
