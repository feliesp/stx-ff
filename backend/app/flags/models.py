"""Database model for a Flag (see GLOSSARY.md for the domain vocabulary)."""

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import JSON, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def utc_now() -> datetime:
    return datetime.now(UTC)


class Flag(Base):
    __tablename__ = "flags"

    id: Mapped[int] = mapped_column(primary_key=True)
    # The Key is how application code refers to a flag, so it's unique and never changes.
    key: Mapped[str] = mapped_column(String(64), unique=True)
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(String(500), default="")
    # New flags start Disabled: a fresh flag usually guards unfinished code.
    enabled: Mapped[bool] = mapped_column(default=False)
    # Incremented on every change; used for optimistic concurrency control.
    version: Mapped[int] = mapped_column(default=1)
    created_at: Mapped[datetime] = mapped_column(default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(default=utc_now)
    # Soft delete: a Deleted flag is hidden everywhere, but its row (and History)
    # is kept and its key stays reserved by the plain unique constraint above.
    deleted_at: Mapped[datetime | None] = mapped_column(default=None)

    __table_args__ = (
        # Names are unique regardless of case ("Checkout" vs "checkout"), among
        # flags that aren't deleted: a deleted flag's name can be used again.
        Index(
            "uq_flags_name_lower",
            func.lower(name),
            unique=True,
            sqlite_where=deleted_at.is_(None),
            postgresql_where=deleted_at.is_(None),
        ),
    )


class FlagChange(Base):
    """One recorded modification of a Flag. A flag's History is its Changes."""

    __tablename__ = "flag_changes"

    id: Mapped[int] = mapped_column(primary_key=True)
    flag_id: Mapped[int] = mapped_column(ForeignKey("flags.id"), index=True)
    # The flag's version after this change.
    version: Mapped[int]
    action: Mapped[str] = mapped_column(String(16))  # "created" | "updated" | "deleted"
    # {field: [old, new]}; old is None for a creation.
    changes: Mapped[dict[str, Any]] = mapped_column(JSON)
    # Links the change to the request's log lines.
    request_id: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(default=utc_now)
