"""Request IDs and structured (JSON) logging.

Every request gets an ID: reused from a well-formed incoming ``X-Request-ID``
header (so a caller's trace continues through us) or freshly generated. It is
echoed back in the response header, included in error bodies, and attached to
every log line written while the request is handled.
"""

import logging
import re
import time
from uuid import uuid4

from fastapi import FastAPI, Request, Response
from pythonjsonlogger.json import JsonFormatter

from app.context import request_id_var
from app.problems import problem_response

REQUEST_ID_HEADER = "X-Request-ID"
# Accept only short, log-safe IDs from callers (prevents log injection).
_SAFE_REQUEST_ID = re.compile(r"[A-Za-z0-9._-]{1,64}")

logger = logging.getLogger("app.requests")


def configure_logging(level: str) -> None:
    """Send JSON log lines to stderr and stamp every record with the request ID."""
    base_factory = logging.getLogRecordFactory()
    if not getattr(base_factory, "adds_request_id", False):

        def record_factory(*args, **kwargs) -> logging.LogRecord:
            record = base_factory(*args, **kwargs)
            record.request_id = request_id_var.get()
            return record

        record_factory.adds_request_id = True  # type: ignore[attr-defined]
        logging.setLogRecordFactory(record_factory)

    handler = logging.StreamHandler()
    handler.set_name("json")
    handler.setFormatter(
        JsonFormatter(
            "{asctime}{levelname}{name}{message}{request_id}",
            style="{",
            rename_fields={"asctime": "timestamp", "levelname": "level"},
        )
    )
    root = logging.getLogger()
    root.handlers = [h for h in root.handlers if h.get_name() != "json"] + [handler]
    root.setLevel(level)


def _request_id_from(request: Request) -> str:
    incoming = request.headers.get(REQUEST_ID_HEADER, "")
    return incoming if _SAFE_REQUEST_ID.fullmatch(incoming) else uuid4().hex


def install_request_context(app: FastAPI) -> None:
    @app.middleware("http")
    async def request_context(request: Request, call_next) -> Response:
        request_id = _request_id_from(request)
        token = request_id_var.set(request_id)
        started = time.perf_counter()
        try:
            try:
                response = await call_next(request)
            except Exception:
                # Log here, while the request ID is still set, and answer with a
                # Problem body instead of a bare 500.
                logger.exception("request.failed")
                response = problem_response(
                    500, "internal_error", "Something went wrong on our side."
                )
            response.headers[REQUEST_ID_HEADER] = request_id
            logger.info(
                "request.completed",
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "duration_ms": round((time.perf_counter() - started) * 1000, 2),
                },
            )
            return response
        finally:
            request_id_var.reset(token)
