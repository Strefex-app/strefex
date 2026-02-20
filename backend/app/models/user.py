"""User model - maps to users table."""
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import String, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class UserRole(str, Enum):
    """Role codes for RBAC (must match Role.code in DB)."""
    ADMIN = "admin"
    MANAGER = "manager"
    USER = "user"


if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.role import Role
    from app.models.project import Project
    from app.models.audit import Audit
    from app.models.rfq import Rfq


class User(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "users"

    company_id: Mapped[PG_UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role_id: Mapped[PG_UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    company: Mapped["Company"] = relationship("Company", back_populates="users", lazy="selectin")
    role: Mapped["Role | None"] = relationship("Role", back_populates="users", lazy="selectin")
    projects_created: Mapped[list["Project"]] = relationship(
        "Project",
        foreign_keys="Project.created_by",
        back_populates="created_by_user",
        lazy="selectin",
    )
    audits_conducted: Mapped[list["Audit"]] = relationship(
        "Audit",
        foreign_keys="Audit.auditor_id",
        back_populates="auditor",
        lazy="selectin",
    )
    rfqs_created: Mapped[list["Rfq"]] = relationship(
        "Rfq",
        foreign_keys="Rfq.created_by",
        back_populates="created_by_user",
        lazy="selectin",
    )

    __table_args__ = (UniqueConstraint("company_id", "email", name="uq_users_company_email"),)

    def __repr__(self) -> str:
        return f"<User {self.email}>"
