"""Database model for a Flag (see GLOSSARY.md for the domain vocabulary)."""

from datetime import UTC, datetime

from sqlalchemy import Index, String, func
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

    __table_args__ = (
        # Names are unique regardless of case ("Checkout" vs "checkout").
        Index("uq_flags_name_lower", func.lower(name), unique=True),
    )
