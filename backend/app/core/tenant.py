"""Tenant context and isolation."""
from dataclasses import dataclass
from typing import Any
from uuid import UUID


@dataclass
class TenantContext:
    """Current request tenant (from JWT)."""
    tenant_id: UUID
    tenant_slug: str | None = None
    role: str = "user"

    @property
    def tenant_id_str(self) -> str:
        return str(self.tenant_id)


def get_tenant_context(payload: dict[str, Any] | None) -> TenantContext | None:
    """Build TenantContext from JWT payload."""
    if not payload or "tenant_id" not in payload:
        return None
    try:
        tid = payload["tenant_id"]
        tenant_id = UUID(tid) if isinstance(tid, str) else tid
    except (TypeError, ValueError):
        return None
    return TenantContext(
        tenant_id=tenant_id,
        tenant_slug=payload.get("tenant_slug"),
        role=payload.get("role", "user"),
    )
