"""HTTP layer for flags: translates requests to service calls and back."""

from fastapi import APIRouter, status

from app.db import SessionDep
from app.flags import service
from app.flags.schemas import FlagCreate, FlagOut
from app.problems import Problem

router = APIRouter(prefix="/flags", tags=["flags"])


@router.get("", response_model=list[FlagOut])
async def list_flags(session: SessionDep):
    return await service.list_flags(session)


@router.post(
    "",
    response_model=FlagOut,
    status_code=status.HTTP_201_CREATED,
    responses={409: {"model": Problem}, 422: {"model": Problem}},
)
async def create_flag(data: FlagCreate, session: SessionDep):
    return await service.create_flag(session, data)
