"""Company (tenant) model - maps to companies table."""
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.role import Role
    from app.models.user import User
    from app.models.project import Project
    from app.models.asset import Asset
    from app.models.audit import Audit
    from app.models.rfq import Rfq


class Company(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "companies"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    roles: Mapped[list["Role"]] = relationship("Role", back_populates="company", lazy="selectin")
    users: Mapped[list["User"]] = relationship("User", back_populates="company", lazy="selectin")
    projects: Mapped[list["Project"]] = relationship("Project", back_populates="company", lazy="selectin")
    assets: Mapped[list["Asset"]] = relationship("Asset", back_populates="company", lazy="selectin")
    audits: Mapped[list["Audit"]] = relationship("Audit", back_populates="company", lazy="selectin")
    rfqs: Mapped[list["Rfq"]] = relationship("Rfq", back_populates="company", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Company {self.slug}>"
