import logging
import re

import pytest

pytestmark = pytest.mark.anyio


async def test_every_response_carries_a_generated_request_id(client):
    response = await client.get("/api/v1/flags")

    assert re.fullmatch(r"[0-9a-f]{32}", response.headers["x-request-id"])


async def test_a_valid_incoming_request_id_is_reused(client):
    response = await client.get("/api/v1/flags", headers={"X-Request-ID": "trace-abc.123"})

    assert response.headers["x-request-id"] == "trace-abc.123"


async def test_an_unsafe_incoming_request_id_is_replaced(client):
    response = await client.get("/api/v1/flags", headers={"X-Request-ID": "bad id\nwith newline"})

    assert re.fullmatch(r"[0-9a-f]{32}", response.headers["x-request-id"])


async def test_problem_responses_include_the_request_id(client):
    response = await client.post(
        "/api/v1/flags", json={"key": "BAD", "name": "x"}, headers={"X-Request-ID": "req-1"}
    )

    assert response.json()["request_id"] == "req-1"


async def test_creating_a_flag_logs_a_domain_event_with_the_request_id(client, caplog):
    caplog.set_level(logging.INFO)

    await client.post(
        "/api/v1/flags",
        json={"key": "new-checkout", "name": "New"},
        headers={"X-Request-ID": "req-2"},
    )

    events = [r for r in caplog.records if r.getMessage() == "flag.created"]
    assert len(events) == 1
    assert events[0].flag_key == "new-checkout"
    assert events[0].request_id == "req-2"


async def test_each_request_is_logged_with_status_and_duration(client, caplog):
    caplog.set_level(logging.INFO)

    await client.get("/api/v1/flags", headers={"X-Request-ID": "req-3"})

    [access] = [r for r in caplog.records if r.getMessage() == "request.completed"]
    assert (access.method, access.path, access.status_code) == ("GET", "/api/v1/flags", 200)
    assert access.duration_ms >= 0
    assert access.request_id == "req-3"
