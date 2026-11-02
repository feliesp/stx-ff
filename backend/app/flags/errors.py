"""Every way a flag operation can be refused, with its Problem Details mapping.

Keeping them in one file makes the API's error contract easy to review.
"""

from app.problems import ProblemError


class FlagKeyTaken(ProblemError):
    def __init__(self, key: str, *, by_deleted_flag: bool = False) -> None:
        message = (
            f"The key '{key}' belonged to a deleted flag and can't be reused."
            if by_deleted_flag
            else f"A flag with key '{key}' already exists."
        )
        super().__init__(409, "flag_key_taken", message, errors={"key": [message]})


class FlagNameTaken(ProblemError):
    def __init__(self, name: str) -> None:
        message = f"A flag named '{name}' already exists."
        super().__init__(409, "flag_name_taken", message, errors={"name": [message]})


class FlagNotFound(ProblemError):
    def __init__(self, key: str) -> None:
        super().__init__(404, "flag_not_found", f"There is no flag with key '{key}'.")


class VersionConflict(ProblemError):
    """The client's version is stale: someone changed the flag since they read it.

    The response carries the flag's current state so the client can show it.
    """

    def __init__(self, current: dict) -> None:
        super().__init__(
            409,
            "version_conflict",
            f"'{current['key']}' had already been edited. Check current values.",
            extra={"current": current},
        )
