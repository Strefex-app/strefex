"""Asset CRUD: RESTful, company-scoped, pagination, filtering, Bubble-friendly JSON."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CompanyId, CurrentUser, get_db
from app.core.multitenant import assert_same_company
from app.schemas.asset import AssetCreate, AssetRead, AssetUpdate
from app.schemas.common import PaginatedResponse
from app.services.asset import asset_service

router = APIRouter()


@router.get("", response_model=PaginatedResponse[AssetRead])
async def list_assets(
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    project_id: uuid.UUID | None = Query(None, description="Filter by project id"),
    status: str | None = Query(None, description="Filter by status (e.g. active, inactive)"),
    asset_type: str | None = Query(None, description="Filter by asset type"),
    search: str | None = Query(None, alias="q", description="Search by name, serial_number, or type"),
    current_user: CurrentUser = None,
    company_id: CompanyId = None,
    db: AsyncSession = Depends(get_db),
):
    """
    List assets for the current company. Bubble-friendly: results, count, page, per_page.
    """
    skip = (page - 1) * per_page
    items = await asset_service.list(
        db,
        company_id,
        skip=skip,
        limit=per_page,
        project_id=project_id,
        status=status,
        asset_type=asset_type,
        search=search,
    )
    total = await asset_service.count(
        db,
        company_id,
        project_id=project_id,
        status=status,
        asset_type=asset_type,
        search=search,
    )
    return PaginatedResponse(
        results=[AssetRead.model_validate(a) for a in items],
        count=total,
        page=page,
        per_page=per_page,
    )


@router.get("/{asset_id}", response_model=AssetRead)
async def get_asset(
    asset_id: uuid.UUID,
    current_user: CurrentUser = None,
    company_id: CompanyId = None,
    db: AsyncSession = Depends(get_db),
):
    """Get one asset by id. 404 if not found or different company."""
    asset = await asset_service.get_by_id(db, asset_id, company_id)
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    assert_same_company(asset.company_id, company_id, "Asset")
    return AssetRead.model_validate(asset)


@router.post("", response_model=AssetRead, status_code=status.HTTP_201_CREATED)
async def create_asset(
    data: AssetCreate,
    current_user: CurrentUser = None,
    company_id: CompanyId = None,
    db: AsyncSession = Depends(get_db),
):
    """Create asset in the current company. company_id from JWT."""
    project_id_uuid = uuid.UUID(str(data.project_id)) if data.project_id else None
    asset = await asset_service.create(
        db,
        company_id=company_id,
        name=data.name,
        asset_type=data.asset_type,
        serial_number=data.serial_number,
        location=data.location,
        status=data.status,
        project_id=project_id_uuid,
        metadata_=data.metadata,
    )
    return AssetRead.model_validate(asset)


@router.patch("/{asset_id}", response_model=AssetRead)
async def update_asset(
    asset_id: uuid.UUID,
    data: AssetUpdate,
    current_user: CurrentUser = None,
    company_id: CompanyId = None,
    db: AsyncSession = Depends(get_db),
):
    """Update asset. 404 if not found or different company. company_id never updated."""
    asset = await asset_service.get_by_id(db, asset_id, company_id)
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    assert_same_company(asset.company_id, company_id, "Asset")
    updates = data.model_dump(exclude_unset=True)
    if "metadata" in updates:
        updates["metadata_"] = updates.pop("metadata")
    if "project_id" in updates and updates["project_id"] is not None:
        updates["project_id"] = uuid.UUID(str(updates["project_id"]))
    asset = await asset_service.update(db, asset, **updates)
    return AssetRead.model_validate(asset)


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset(
    asset_id: uuid.UUID,
    current_user: CurrentUser = None,
    company_id: CompanyId = None,
    db: AsyncSession = Depends(get_db),
):
    """Delete asset. 404 if not found or different company."""
    asset = await asset_service.get_by_id(db, asset_id, company_id)
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    assert_same_company(asset.company_id, company_id, "Asset")
    await asset_service.delete(db, asset)
