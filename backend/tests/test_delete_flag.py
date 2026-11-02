import logging

import pytest

pytestmark = pytest.mark.anyio


@pytest.fixture
async def flag(client):
    response = await client.post("/api/v1/flags", json={"key": "new-checkout", "name": "New"})
    return response.json()


async def delete(client, version=1, key="new-checkout"):
    return await client.delete(f"/api/v1/flags/{key}", params={"version": version})


async def test_a_deleted_flag_disappears_everywhere(client, flag):
    response = await delete(client)

    assert response.status_code == 204
    assert (await client.get("/api/v1/flags")).json() == []
    assert (await client.get("/api/v1/flags/new-checkout/history")).status_code == 404
    patched = await client.patch("/api/v1/flags/new-checkout", json={"version": 2, "enabled": True})
    assert patched.status_code == 404


async def test_deleting_with_a_stale_version_is_a_conflict(client, flag):
    await client.patch("/api/v1/flags/new-checkout", json={"version": 1, "enabled": True})

    response = await delete(client, version=1)

    assert response.status_code == 409
    assert response.json()["type"] == "version_conflict"


async def test_deleting_twice_is_not_found(client, flag):
    await delete(client)

    assert (await delete(client, version=2)).status_code == 404


async def test_a_deleted_flags_key_can_never_be_reused(client, flag):
    await delete(client)

    response = await client.post("/api/v1/flags", json={"key": "new-checkout", "name": "Other"})

    assert response.status_code == 409
    problem = response.json()
    assert problem["type"] == "flag_key_taken"
    assert "deleted flag" in problem["errors"]["key"][0]


async def test_a_deleted_flags_name_can_be_reused(client, flag):
    await delete(client)

    response = await client.post("/api/v1/flags", json={"key": "brand-new", "name": "New"})

    assert response.status_code == 201


async def test_version_is_required(client, flag):
    response = await client.delete("/api/v1/flags/new-checkout")

    assert response.status_code == 422
    assert "version" in response.json()["errors"]


async def test_deleting_logs_an_event(client, flag, caplog):
    caplog.set_level(logging.INFO)

    await delete(client)

    [event] = [r for r in caplog.records if r.getMessage() == "flag.deleted"]
    assert (event.flag_key, event.version) == ("new-checkout", 2)
