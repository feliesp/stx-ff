"""RFC 9457 "Problem Details" error responses.

Every error the API returns has the same JSON shape, served as
``application/problem+json``::

    {"type": "flag_key_taken", "title": "...", "status": 409,
     "errors": {"key": ["..."]}}

``type`` is a stable, machine-readable code clients can switch on; ``title`` is
for humans; ``errors`` maps field names to messages for validation problems.
"""

from http import HTTPStatus
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.exceptions import HTTPException

from app.context import request_id_var

PROBLEM_MEDIA_TYPE = "application/problem+json"


class Problem(BaseModel):
    """Documents the error shape in OpenAPI."""

    type: str
    title: str
    status: int
    detail: str | None = None
    errors: dict[str, list[str]] | None = None
    request_id: str | None = None
    current: dict[str, Any] | None = None


class ProblemError(Exception):
    """Raise anywhere to return a Problem Details response."""

    def __init__(
        self,
        status: int,
        type: str,
        title: str,
        *,
        errors: dict[str, list[str]] | None = None,
        extra: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(title)
        self.status = status
        self.type = type
        self.title = title
        self.errors = errors
        self.extra = extra or {}


def problem_response(
    status: int,
    type: str,
    title: str,
    *,
    errors: dict[str, list[str]] | None = None,
    extra: dict[str, Any] | None = None,
) -> JSONResponse:
    body: dict[str, Any] = {"type": type, "title": title, "status": status}
    if errors:
        body["errors"] = errors
    body.update(extra or {})
    body["request_id"] = request_id_var.get()
    return JSONResponse(status_code=status, content=body, media_type=PROBLEM_MEDIA_TYPE)


def field_errors(exc: RequestValidationError) -> dict[str, list[str]]:
    """Group Pydantic errors by field: loc ("body", "key") becomes "key"."""
    errors: dict[str, list[str]] = {}
    for error in exc.errors():
        location = [str(part) for part in error["loc"] if part not in ("body", "query", "path")]
        field = ".".join(location) or "request"
        message = error["msg"].removeprefix("Value error, ")
        errors.setdefault(field, []).append(message)
    return errors


async def _handle_problem(request: Request, exc: ProblemError) -> JSONResponse:
    return problem_response(exc.status, exc.type, exc.title, errors=exc.errors, extra=exc.extra)


async def _handle_validation(request: Request, exc: RequestValidationError) -> JSONResponse:
    return problem_response(
        422, "validation_error", "The request is invalid.", errors=field_errors(exc)
    )


async def _handle_http(request: Request, exc: HTTPException) -> JSONResponse:
    phrase = HTTPStatus(exc.status_code).phrase
    return problem_response(exc.status_code, phrase.lower().replace(" ", "_"), str(exc.detail))


async def _handle_unexpected(request: Request, exc: Exception) -> JSONResponse:
    return problem_response(500, "internal_error", "Something went wrong on our side.")


def register_problem_handlers(app: FastAPI) -> None:
    app.add_exception_handler(ProblemError, _handle_problem)
    app.add_exception_handler(RequestValidationError, _handle_validation)
    app.add_exception_handler(HTTPException, _handle_http)
    app.add_exception_handler(Exception, _handle_unexpected)
