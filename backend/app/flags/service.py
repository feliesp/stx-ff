"""Flag use cases. The one place that decides what happens when flags change.

Functions take an ``AsyncSession`` and know nothing about HTTP.
"""

import logging
from collections.abc import Sequence

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.context import request_id_var
from app.flags.errors import FlagKeyTaken, FlagNameTaken, FlagNotFound, VersionConflict
from app.flags.models import Flag, FlagChange, utc_now
from app.flags.schemas import FlagCreate, FlagOut, FlagUpdate

logger = logging.getLogger(__name__)

# Fields recorded in a flag's History.
TRACKED_FIELDS = ("key", "name", "description", "enabled")


async def list_flags(session: AsyncSession) -> Sequence[Flag]:
    result = await session.scalars(select(Flag).order_by(Flag.key))
    return result.all()


async def create_flag(session: AsyncSession, data: FlagCreate) -> Flag:
    flag = Flag(key=data.key, name=data.name, description=data.description)
    session.add(flag)
    try:
        await session.flush()  # assigns flag.id; unique violations surface here
        changes = {field: [None, getattr(flag, field)] for field in TRACKED_FIELDS}
        session.add(_record_change(flag, "created", changes))
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


async def update_flag(session: AsyncSession, key: str, data: FlagUpdate) -> Flag:
    """Apply a partial update, guarded by optimistic concurrency control.

    The client sends the ``version`` its change is based on. The write is a
    single ``UPDATE ... WHERE id = ? AND version = ?``: check and write happen
    in one statement, so two concurrent updates can't both pass the check.
    """
    flag = await _get_flag(session, key)
    if flag.version != data.version:
        raise _conflict(flag)

    requested = data.model_dump(exclude_unset=True, exclude={"version"})
    changes = {
        field: [getattr(flag, field), value]
        for field, value in requested.items()
        if getattr(flag, field) != value
    }
    if not changes:
        return flag  # nothing to change: no new version, no event

    result = await session.execute(
        update(Flag)
        .where(Flag.id == flag.id, Flag.version == data.version)
        .values(
            **{field: new for field, (_old, new) in changes.items()},
            version=Flag.version + 1,
            updated_at=utc_now(),
        )
        .execution_options(synchronize_session=False)
    )
    if result.rowcount == 0:
        # Someone else wrote between our read and our write.
        await session.rollback()
        raise _conflict(await _get_flag(session, key))
    # Same transaction as the UPDATE: the change and its History entry are
    # committed together or not at all.
    session.add(_record_change(flag, "updated", changes, version=data.version + 1))
    await session.commit()
    await session.refresh(flag)

    logger.info(
        "flag.updated",
        extra={"flag_key": flag.key, "version": flag.version, "changes": changes},
    )
    return flag


async def flag_history(session: AsyncSession, key: str) -> Sequence[FlagChange]:
    """A flag's Changes, newest first."""
    flag = await _get_flag(session, key)
    result = await session.scalars(
        select(FlagChange).where(FlagChange.flag_id == flag.id).order_by(FlagChange.version.desc())
    )
    return result.all()


def _record_change(
    flag: Flag, action: str, changes: dict, *, version: int | None = None
) -> FlagChange:
    return FlagChange(
        flag_id=flag.id,
        version=version or flag.version,
        action=action,
        changes=changes,
        request_id=request_id_var.get(),
    )


async def _get_flag(session: AsyncSession, key: str) -> Flag:
    flag = await session.scalar(
        select(Flag).where(Flag.key == key).execution_options(populate_existing=True)
    )
    if flag is None:
        raise FlagNotFound(key)
    return flag


def _conflict(flag: Flag) -> VersionConflict:
    return VersionConflict(FlagOut.model_validate(flag).model_dump(mode="json"))
