"""Request and response shapes for the flags API (Pydantic models)."""

import re
from datetime import UTC, datetime
from typing import Annotated, Any, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StringConstraints


def as_utc(value: datetime) -> datetime:
    # SQLite drops timezone info; every timestamp we store is UTC.
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value


UtcDatetime = Annotated[datetime, AfterValidator(as_utc)]

KEY_PATTERN = re.compile(r"^[a-z][a-z0-9_-]{1,63}$")


def valid_key(value: str) -> str:
    if not KEY_PATTERN.fullmatch(value):
        raise ValueError("Use 2-64 lowercase letters, digits, '-' or '_', starting with a letter.")
    return value


FlagKey = Annotated[str, AfterValidator(valid_key)]


FlagName = Annotated[str, StringConstraints(min_length=1, max_length=100)]
FlagDescription = Annotated[str, StringConstraints(max_length=500)]


class FlagCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    key: FlagKey
    name: FlagName
    description: FlagDescription = ""


class FlagUpdate(BaseModel):
    """A partial update. ``version`` is the version the client's change is based on.

    The key is deliberately absent (and extra fields are rejected): code refers
    to flags by key, so it can never change.
    """

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    version: Annotated[int, Field(ge=1)]
    enabled: bool | None = None
    name: FlagName | None = None
    description: FlagDescription | None = None


class FlagOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    key: str
    name: str
    description: str
    enabled: bool
    version: int
    created_at: UtcDatetime
    updated_at: UtcDatetime


class ChangeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    version: int
    action: Literal["created", "updated", "deleted"]
    changes: dict[str, list[Any]]
    request_id: str | None
    created_at: UtcDatetime
