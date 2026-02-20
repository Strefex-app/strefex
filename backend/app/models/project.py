"""Project model - maps to projects table."""
from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import String, Text, Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.user import User
    from app.models.asset import Asset
    from app.models.audit import Audit
    from app.models.rfq import Rfq


class Project(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "projects"

    company_id: Mapped[PG_UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="draft", nullable=False)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_by: Mapped[PG_UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    company: Mapped["Company"] = relationship("Company", back_populates="projects", lazy="selectin")
    created_by_user: Mapped["User | None"] = relationship(
        "User",
        foreign_keys=[created_by],
        back_populates="projects_created",
        lazy="selectin",
    )
    assets: Mapped[list["Asset"]] = relationship("Asset", back_populates="project", lazy="selectin")
    audits: Mapped[list["Audit"]] = relationship("Audit", back_populates="project", lazy="selectin")
    rfqs: Mapped[list["Rfq"]] = relationship("Rfq", back_populates="project", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Project {self.name}>"
