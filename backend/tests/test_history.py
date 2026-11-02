import pytest

pytestmark = pytest.mark.anyio


@pytest.fixture
async def flag(client):
    response = await client.post(
        "/api/v1/flags",
        json={"key": "new-checkout", "name": "New"},
        headers={"X-Request-ID": "create-req"},
    )
    return response.json()


async def history(client, key="new-checkout"):
    return await client.get(f"/api/v1/flags/{key}/history")


async def test_creation_is_the_first_change(client, flag):
    response = await history(client)

    assert response.status_code == 200
    [created] = response.json()
    assert created["action"] == "created"
    assert created["version"] == 1
    assert created["changes"]["name"] == [None, "New"]
    assert created["changes"]["enabled"] == [None, False]
    assert created["request_id"] == "create-req"
    assert created["created_at"].endswith("Z")


async def test_updates_are_listed_newest_first_with_what_changed(client, flag):
    await client.patch(
        "/api/v1/flags/new-checkout",
        json={"version": 1, "enabled": True},
        headers={"X-Request-ID": "toggle-req"},
    )

    latest, first = (await history(client)).json()

    assert (latest["action"], latest["version"]) == ("updated", 2)
    assert latest["changes"] == {"enabled": [False, True]}
    assert latest["request_id"] == "toggle-req"
    assert first["action"] == "created"


async def test_rejected_updates_leave_no_trace(client, flag):
    await client.patch("/api/v1/flags/new-checkout", json={"version": 1, "enabled": True})
    await client.patch("/api/v1/flags/new-checkout", json={"version": 1, "enabled": False})  # 409
    await client.patch("/api/v1/flags/new-checkout", json={"version": 2, "enabled": True})  # no-op

    assert [change["version"] for change in (await history(client)).json()] == [2, 1]


async def test_history_of_an_unknown_flag_is_not_found(client):
    response = await history(client, key="missing")

    assert response.status_code == 404
