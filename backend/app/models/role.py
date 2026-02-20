"""Role model - maps to roles table."""
from typing import TYPE_CHECKING

from sqlalchemy import String, Text, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.user import User


class Role(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "roles"

    company_id: Mapped[PG_UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    company: Mapped["Company"] = relationship("Company", back_populates="roles", lazy="selectin")
    users: Mapped[list["User"]] = relationship("User", back_populates="role", lazy="selectin")

    __table_args__ = (UniqueConstraint("company_id", "code", name="uq_roles_company_code"),)

    def __repr__(self) -> str:
        return f"<Role {self.code}>"
