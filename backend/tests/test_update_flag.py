import logging

import pytest

pytestmark = pytest.mark.anyio


@pytest.fixture
async def flag(client):
    response = await client.post("/api/v1/flags", json={"key": "new-checkout", "name": "New"})
    return response.json()


async def patch(client, body, key="new-checkout"):
    return await client.patch(f"/api/v1/flags/{key}", json=body)


async def test_enabling_a_flag_bumps_its_version(client, flag):
    response = await patch(client, {"version": 1, "enabled": True})

    assert response.status_code == 200
    body = response.json()
    assert body["enabled"] is True
    assert body["version"] == 2
    assert body["updated_at"] >= flag["updated_at"]


async def test_the_change_is_visible_in_the_list(client, flag):
    await patch(client, {"version": 1, "enabled": True})

    [listed] = (await client.get("/api/v1/flags")).json()

    assert (listed["enabled"], listed["version"]) == (True, 2)


async def test_a_stale_version_is_rejected_with_the_current_flag(client, flag):
    await patch(client, {"version": 1, "enabled": True})  # someone else, first

    response = await patch(client, {"version": 1, "enabled": False})  # based on stale data

    assert response.status_code == 409
    problem = response.json()
    assert problem["type"] == "version_conflict"
    assert "had already been edited" in problem["title"]
    assert problem["current"]["enabled"] is True
    assert problem["current"]["version"] == 2


async def test_setting_the_current_value_again_changes_nothing(client, flag):
    response = await patch(client, {"version": 1, "enabled": False})

    assert response.status_code == 200
    assert response.json()["version"] == 1


async def test_version_is_required(client, flag):
    response = await patch(client, {"enabled": True})

    assert response.status_code == 422
    assert "version" in response.json()["errors"]


async def test_unknown_flag_is_not_found(client):
    response = await patch(client, {"version": 1, "enabled": True}, key="missing")

    assert response.status_code == 404
    assert response.json()["type"] == "flag_not_found"


async def test_a_change_logs_what_changed(client, flag, caplog):
    caplog.set_level(logging.INFO)

    await patch(client, {"version": 1, "enabled": True})

    [event] = [r for r in caplog.records if r.getMessage() == "flag.updated"]
    assert event.flag_key == "new-checkout"
    assert event.version == 2
    assert event.changes == {"enabled": [False, True]}
