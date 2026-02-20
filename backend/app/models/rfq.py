"""RFQ and RFQ line item models - maps to rfqs and rfq_line_items tables."""
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import String, Text, Date, Integer, Numeric, ForeignKey, UniqueConstraint, DateTime
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.project import Project
    from app.models.user import User


class Rfq(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "rfqs"

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
    rfq_number: Mapped[str | None] = mapped_column(String(64), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="draft", nullable=False)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    issued_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[PG_UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    company: Mapped["Company"] = relationship("Company", back_populates="rfqs", lazy="selectin")
    project: Mapped["Project | None"] = relationship("Project", back_populates="rfqs", lazy="selectin")
    created_by_user: Mapped["User | None"] = relationship(
        "User",
        foreign_keys=[created_by],
        back_populates="rfqs_created",
        lazy="selectin",
    )
    line_items: Mapped[list["RfqLineItem"]] = relationship(
        "RfqLineItem",
        back_populates="rfq",
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    __table_args__ = (UniqueConstraint("company_id", "rfq_number", name="uq_rfqs_company_rfq_number"),)

    def __repr__(self) -> str:
        return f"<Rfq {self.rfq_number or self.title}>"


class RfqLineItem(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "rfq_line_items"

    rfq_id: Mapped[PG_UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("rfqs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    company_id: Mapped[PG_UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    line_number: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    quantity: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    unit: Mapped[str | None] = mapped_column(String(32), nullable=True)

    rfq: Mapped["Rfq"] = relationship("Rfq", back_populates="line_items", lazy="selectin")

    __table_args__ = (UniqueConstraint("rfq_id", "line_number", name="uq_rfq_line_items_rfq_line"),)

    def __repr__(self) -> str:
        return f"<RfqLineItem {self.line_number}>"
