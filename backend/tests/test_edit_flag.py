import pytest

pytestmark = pytest.mark.anyio


@pytest.fixture
async def flag(client):
    response = await client.post("/api/v1/flags", json={"key": "new-checkout", "name": "New"})
    return response.json()


async def patch(client, body):
    return await client.patch("/api/v1/flags/new-checkout", json=body)


async def test_name_and_description_can_be_edited(client, flag):
    response = await patch(
        client, {"version": 1, "name": "  New checkout  ", "description": "Redesign"}
    )

    assert response.status_code == 200
    body = response.json()
    assert (body["name"], body["description"], body["version"]) == ("New checkout", "Redesign", 2)
    [latest, _] = (await client.get("/api/v1/flags/new-checkout/history")).json()
    assert latest["changes"] == {"name": ["New", "New checkout"], "description": ["", "Redesign"]}


async def test_the_key_can_never_be_changed(client, flag):
    response = await patch(client, {"version": 1, "key": "renamed"})

    assert response.status_code == 422
    assert "key" in response.json()["errors"]


async def test_a_blank_name_is_invalid(client, flag):
    response = await patch(client, {"version": 1, "name": "  "})

    assert response.status_code == 422
    assert "name" in response.json()["errors"]


async def test_renaming_to_a_taken_name_is_a_conflict(client, flag):
    await client.post("/api/v1/flags", json={"key": "dark-mode", "name": "Dark mode"})

    response = await patch(client, {"version": 1, "name": "DARK MODE"})

    assert response.status_code == 409
    assert response.json()["type"] == "flag_name_taken"
    assert (await client.get("/api/v1/flags")).json()[1]["version"] == 1  # unchanged
