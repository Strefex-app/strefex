"""Asset service: CRUD scoped by company_id (multi-tenant isolation)."""
import uuid
from typing import Any, Sequence

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.asset import Asset
from app.repositories.asset import asset_repository


class AssetService:
    """All operations use company_id from tenant context; never from request body."""

    async def list(
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
        return await asset_repository.list_by_company(
            session,
            company_id,
            skip=skip,
            limit=limit,
            project_id=project_id,
            status=status,
            asset_type=asset_type,
            search=search,
        )

    async def count(
        self,
        session: AsyncSession,
        company_id: uuid.UUID,
        project_id: uuid.UUID | None = None,
        status: str | None = None,
        asset_type: str | None = None,
        search: str | None = None,
    ) -> int:
        return await asset_repository.count_by_company(
            session,
            company_id,
            project_id=project_id,
            status=status,
            asset_type=asset_type,
            search=search,
        )

    async def get_by_id(
        self,
        session: AsyncSession,
        asset_id: uuid.UUID,
        company_id: uuid.UUID,
    ) -> Asset | None:
        return await asset_repository.get_by_id(session, asset_id, company_id)

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
        return await asset_repository.create(
            session,
            company_id=company_id,
            name=name,
            asset_type=asset_type,
            serial_number=serial_number,
            location=location,
            status=status,
            project_id=project_id,
            metadata_=metadata_,
        )

    async def update(
        self,
        session: AsyncSession,
        asset: Asset,
        **kwargs: Any,
    ) -> Asset:
        return await asset_repository.update(session, asset, **kwargs)

    async def delete(self, session: AsyncSession, asset: Asset) -> None:
        await asset_repository.delete(session, asset)


asset_service = AssetService()
