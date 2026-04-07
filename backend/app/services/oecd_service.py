"""OECD SDMX-JSON stats (PPI, wages, transport — dataset-dependent)."""
from __future__ import annotations

from typing import Any

import httpx


async def get_oecd_data(dataset: str, **params: Any) -> dict[str, Any]:
    """
    Generic OECD data browser fetch. Dataset ids vary; caller supplies full path when needed.
    Example pattern: stats.oecd.org/sdmx-json/data/{flow}/{key}
    """
    # Minimal placeholder: many OECD flows require structured keys; return envelope for UI
    base = "https://stats.oecd.org/sdmx-json/data"
    path = params.get("path", f"{dataset}/all")
    url = f"{base}/{path}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.get(url)
        if r.status_code >= 400:
            return {"source": "oecd", "dataset": dataset, "status": r.status_code, "note": "flow may require a specific filter key"}
        return r.json()
