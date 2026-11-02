"""Request and response shapes for the flags API (Pydantic models)."""

import re
from datetime import UTC, datetime
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, StringConstraints


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


class FlagCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    key: FlagKey
    name: Annotated[str, StringConstraints(min_length=1, max_length=100)]
    description: Annotated[str, StringConstraints(max_length=500)] = ""


class FlagOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    key: str
    name: str
    description: str
    enabled: bool
    version: int
    created_at: UtcDatetime
    updated_at: UtcDatetime
