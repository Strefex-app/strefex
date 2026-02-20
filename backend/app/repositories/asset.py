"""Asset repository: all queries scoped by company_id for multi-tenant isolation."""
import uuid
from typing import Any, Sequence

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.asset import Asset


class AssetRepository:
    """Every method requires company_id; never query without it."""

    def _list_filters(
        self,
        company_id: uuid.UUID,
        project_id: uuid.UUID | None,
        status: str | None,
        asset_type: str | None,
        search: str | None,
    ):
        stmt = select(Asset).where(Asset.company_id == company_id)
        if project_id is not None:
            stmt = stmt.where(Asset.project_id == project_id)
        if status:
            stmt = stmt.where(Asset.status == status)
        if asset_type:
            stmt = stmt.where(Asset.asset_type == asset_type)
        if search and search.strip():
            q = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(
                    Asset.name.ilike(q),
                    Asset.serial_number.ilike(q),
                    Asset.asset_type.ilike(q),
                )
            )
        return stmt

    async def count_by_company(
        self,
        session: AsyncSession,
        company_id: uuid.UUID,
        project_id: uuid.UUID | None = None,
        status: str | None = None,
        asset_type: str | None = None,
        search: str | None = None,
    ) -> int:
        stmt = select(func.count(Asset.id)).where(Asset.company_id == company_id)
        if project_id is not None:
            stmt = stmt.where(Asset.project_id == project_id)
        if status:
            stmt = stmt.where(Asset.status == status)
        if asset_type:
            stmt = stmt.where(Asset.asset_type == asset_type)
        if search and search.strip():
            q = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(
                    Asset.name.ilike(q),
                    Asset.serial_number.ilike(q),
                    Asset.asset_type.ilike(q),
                )
            )
        result = await session.execute(stmt)
        return result.scalar() or 0

    async def list_by_company(
        self,
        session: AsyncSession,
        company_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100,
        project_id: uuid.UUID | None = None,
        status: str | None = None,
        asset_type: str | None = None,
        search: str | None = None,
    ) -> Sequence[Asset]:
        stmt = (
            self._list_filters(company_id, project_id, status, asset_type, search)
            .order_by(Asset.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await session.execute(stmt)
        return result.scalars().all()

    async def get_by_id(
        self,
        session: AsyncSession,
        asset_id: uuid.UUID,
        company_id: uuid.UUID,
    ) -> Asset | None:
        result = await session.execute(
            select(Asset).where(
                Asset.id == asset_id,
                Asset.company_id == company_id,
            )
        )
        return result.scalar_one_or_none()

    async def create(
        self,
        session: AsyncSession,
        company_id: uuid.UUID,
        name: str,
        asset_type: str,
        serial_number: str | None = None,
        location: str | None = None,
        status: str = "active",
        project_id: uuid.UUID | None = None,
        metadata_: dict[str, Any] | None = None,
    ) -> Asset:
        asset = Asset(
            company_id=company_id,
            project_id=project_id,
            name=name,
            asset_type=asset_type,
            serial_number=serial_number,
            location=location,
            status=status,
            metadata_=metadata_,
        )
        session.add(asset)
        await session.flush()
        await session.refresh(asset)
        return asset

    async def update(
        self,
        session: AsyncSession,
        asset: Asset,
        **kwargs: Any,
    ) -> Asset:
        kwargs.pop("company_id", None)
        if "metadata" in kwargs:
            kwargs["metadata_"] = kwargs.pop("metadata")
        for key, value in kwargs.items():
            if hasattr(asset, key):
                setattr(asset, key, value)
        await session.flush()
        await session.refresh(asset)
        return asset

    async def delete(self, session: AsyncSession, asset: Asset) -> None:
        await session.delete(asset)
        await session.flush()


asset_repository = AssetRepository()
