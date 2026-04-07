from fastapi import APIRouter

from app.api.v1 import auth, billing, cost_transformation, example, projects, tenants, users, assets

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(example.router, prefix="/example", tags=["example-protected"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(tenants.router, prefix="/tenants", tags=["tenants"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(assets.router, prefix="/assets", tags=["assets"])
api_router.include_router(billing.router, prefix="/billing", tags=["billing"])
api_router.include_router(cost_transformation.router, prefix="/cti", tags=["cost-transformation"])