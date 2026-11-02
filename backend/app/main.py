"""Application factory.

``create_app`` builds a fully wired FastAPI app from ``Settings``. Tests call it
with their own settings (e.g. a temporary database); uvicorn uses the
module-level ``app``.
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy.ext.asyncio import async_sessionmaker

from app import health
from app.config import Settings
from app.db import create_database
from app.flags.router import router as flags_router
from app.problems import register_problem_handlers


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        engine = await create_database(settings.database_url)
        # expire_on_commit=False: objects stay readable after commit, which async
        # code needs (lazy refresh would require I/O outside an await).
        app.state.sessionmaker = async_sessionmaker(engine, expire_on_commit=False)
        yield
        await engine.dispose()

    app = FastAPI(title="Feature Flag Manager", version="0.1.0", lifespan=lifespan)
    register_problem_handlers(app)
    app.include_router(health.router, prefix="/api/v1")
    app.include_router(flags_router, prefix="/api/v1")
    return app


app = create_app()
