"""Shared fixtures: every test gets a fresh app wired to its own SQLite file.

`ASGITransport` runs the whole FastAPI app in-process (middleware included),
so tests exercise the real HTTP stack without starting a server.
"""

from collections.abc import AsyncIterator
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

from app.config import Settings
from app.main import create_app


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture
async def client(tmp_path: Path) -> AsyncIterator[AsyncClient]:
    settings = Settings(database_url=f"sqlite+aiosqlite:///{tmp_path / 'test.sqlite3'}")
    app = create_app(settings)
    # ASGITransport doesn't send lifespan events, so run startup/shutdown explicitly.
    async with app.router.lifespan_context(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            yield client
