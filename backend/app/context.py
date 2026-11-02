"""Per-request context shared across layers.

A ``ContextVar`` rather than a thread-local: with async code one thread
interleaves many requests, and a context variable is isolated per task.
"""

from contextvars import ContextVar

request_id_var: ContextVar[str | None] = ContextVar("request_id", default=None)
