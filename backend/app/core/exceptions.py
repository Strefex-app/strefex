"""Custom HTTP exceptions and handlers."""
from fastapi import Request, status
from fastapi.responses import JSONResponse


async def http_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Generic handler for HTTP exceptions (customize as needed)."""
    if hasattr(exc, "status_code") and hasattr(exc, "detail"):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )
