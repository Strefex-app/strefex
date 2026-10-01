from fastapi import APIRouter

from app.api.v1 import auth, billing, cost_transformation, example, football_training, projects, users, assets
from app.config import get_settings

api_router = APIRouter()
settings = get_settings()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(assets.router, prefix="/assets", tags=["assets"])
api_router.include_router(billing.router, prefix="/billing", tags=["billing"])
api_router.include_router(cost_transformation.router, prefix="/cti", tags=["cost-transformation"])
api_router.include_router(football_training.router, prefix="/football", tags=["football-training"])

# Demo router — development only
if settings.debug:
    api_router.include_router(example.router, prefix="/example", tags=["example-protected"])
