"""Multi-tenant data isolation: company-scoped queries and cross-company prevention."""
from uuid import UUID

from fastapi import HTTPException, status


def assert_same_company(
    resource_company_id: UUID | None,
    current_company_id: UUID,
    resource_name: str = "Resource",
) -> None:
    """
    Raise 404 if resource does not belong to current company.
    Use after fetching a resource by id to prevent cross-company access.

    Returns None if resource_company_id == current_company_id.
    Raises HTTP 404 (not 403) to avoid leaking existence of other tenants' data.
    """
    if resource_company_id is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource_name} not found",
        )
    if resource_company_id != current_company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource_name} not found",
        )
