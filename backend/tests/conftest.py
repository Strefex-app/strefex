"""
Shared pytest fixtures for backend tests.
Sets up an async test database, test client, and auth helpers.
"""
import os
import asyncio
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Override settings before importing app
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/strefex_test")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-do-not-use-in-production")
os.environ.setdefault("JWT_ALGORITHM", "HS256")
os.environ.setdefault("JWT_ACCESS_EXPIRE_MINUTES", "60")

from app.main import app
from app.database import get_db
from app.models.base import Base
from app.core.security import create_access_token, get_password_hash

# Test database
TEST_DB_URL = os.environ["DATABASE_URL"]
test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestSessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(scope="session")
def event_loop():
    """Create a single event loop for the entire test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_database():
    """Create all tables before tests, drop after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provide a transactional DB session that rolls back after each test."""
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Async test client with overridden DB dependency."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


def make_auth_header(user_id: str = "test-user-id", tenant_id: str = "test-tenant-id", role: str = "user") -> dict:
    """Generate a valid JWT Authorization header for testing."""
    token = create_access_token(
        subject=user_id,
        tenant_id=tenant_id,
        role=role,
    )
    return {"Authorization": f"Bearer {token}"}
