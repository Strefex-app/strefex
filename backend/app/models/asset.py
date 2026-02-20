"""Asset (equipment / machines) model - maps to assets table."""
from typing import TYPE_CHECKING, Any

from sqlalchemy import String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.project import Project
    from app.models.audit import Audit


class Asset(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "assets"

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
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    asset_type: Mapped[str] = mapped_column(String(64), nullable=False)
    serial_number: Mapped[str | None] = mapped_column(String(128), nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)
    metadata_: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSONB, nullable=True)

    company: Mapped["Company"] = relationship("Company", back_populates="assets", lazy="selectin")
    project: Mapped["Project | None"] = relationship("Project", back_populates="assets", lazy="selectin")
    audits: Mapped[list["Audit"]] = relationship("Audit", back_populates="asset", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Asset {self.name}>"
