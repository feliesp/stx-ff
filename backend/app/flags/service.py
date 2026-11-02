"""Flag use cases. The one place that decides what happens when flags change.

Functions take an ``AsyncSession`` and know nothing about HTTP.
"""

import logging
from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.flags.errors import FlagKeyTaken, FlagNameTaken
from app.flags.models import Flag
from app.flags.schemas import FlagCreate

logger = logging.getLogger(__name__)


async def list_flags(session: AsyncSession) -> Sequence[Flag]:
    result = await session.scalars(select(Flag).order_by(Flag.key))
    return result.all()


async def create_flag(session: AsyncSession, data: FlagCreate) -> Flag:
    flag = Flag(key=data.key, name=data.name, description=data.description)
    session.add(flag)
    try:
        await session.commit()
    except IntegrityError:
        # The database's unique constraints are the source of truth, so two
        # concurrent creates can't both succeed. Work out which one was hit.
        await session.rollback()
        raise await _uniqueness_error(session, data) from None
    logger.info("flag.created", extra={"flag_key": flag.key, "version": flag.version})
    return flag


async def _uniqueness_error(session: AsyncSession, data: FlagCreate) -> Exception:
    key_taken = await session.scalar(select(Flag.id).where(Flag.key == data.key))
    if key_taken is not None:
        return FlagKeyTaken(data.key)
    return FlagNameTaken(data.name)
