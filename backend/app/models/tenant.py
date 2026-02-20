"""Tenant (company) model."""
from sqlalchemy import String
from sqlalchemy.orm import Mapped, relationship, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class Tenant(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "tenants"

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    users: Mapped[list["User"]] = relationship("User", back_populates="tenant", lazy="selectin")
