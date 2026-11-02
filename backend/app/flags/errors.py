"""Every way a flag operation can be refused, with its Problem Details mapping.

Keeping them in one file makes the API's error contract easy to review.
"""

from app.problems import ProblemError


class FlagKeyTaken(ProblemError):
    def __init__(self, key: str) -> None:
        message = f"A flag with key '{key}' already exists."
        super().__init__(409, "flag_key_taken", message, errors={"key": [message]})


class FlagNameTaken(ProblemError):
    def __init__(self, name: str) -> None:
        message = f"A flag named '{name}' already exists."
        super().__init__(409, "flag_name_taken", message, errors={"name": [message]})
