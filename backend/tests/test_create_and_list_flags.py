import pytest

pytestmark = pytest.mark.anyio


async def create(client, **overrides):
    payload = {"key": "new-checkout", "name": "New checkout", **overrides}
    return await client.post("/api/v1/flags", json=payload)


async def test_created_flag_is_disabled_at_version_one(client):
    response = await create(client, description="Redesigned checkout flow")

    assert response.status_code == 201
    body = response.json()
    assert body["key"] == "new-checkout"
    assert body["name"] == "New checkout"
    assert body["description"] == "Redesigned checkout flow"
    assert body["enabled"] is False
    assert body["version"] == 1
    assert body["created_at"].endswith("Z")


async def test_list_returns_flags_sorted_by_key(client):
    await create(client, key="zeta", name="Zeta")
    await create(client, key="alpha", name="Alpha")

    response = await client.get("/api/v1/flags")

    assert response.status_code == 200
    assert [flag["key"] for flag in response.json()] == ["alpha", "zeta"]


async def test_list_is_empty_when_there_are_no_flags(client):
    response = await client.get("/api/v1/flags")

    assert response.json() == []


@pytest.mark.parametrize("bad_key", ["New-Checkout", "1st-flag", "has space", "x", "a" * 65])
async def test_key_must_be_a_lowercase_slug(client, bad_key):
    response = await create(client, key=bad_key)

    assert response.status_code == 422
    assert response.headers["content-type"] == "application/problem+json"
    problem = response.json()
    assert problem["type"] == "validation_error"
    assert problem["status"] == 422
    assert list(problem["errors"]) == ["key"]
    assert "lowercase" in problem["errors"]["key"][0]


async def test_name_is_required_and_trimmed(client):
    blank = await create(client, name="   ")
    padded = await create(client, name="  New checkout  ")

    assert blank.status_code == 422
    assert "name" in blank.json()["errors"]
    assert padded.json()["name"] == "New checkout"


async def test_duplicate_key_is_a_conflict(client):
    await create(client)

    response = await create(client, name="Another name")

    assert response.status_code == 409
    problem = response.json()
    assert problem["type"] == "flag_key_taken"
    assert list(problem["errors"]) == ["key"]


async def test_names_are_unique_regardless_of_case(client):
    await create(client, key="checkout-v2", name="Checkout v2")

    response = await create(client, key="other-key", name="CHECKOUT V2")

    assert response.status_code == 409
    problem = response.json()
    assert problem["type"] == "flag_name_taken"
    assert list(problem["errors"]) == ["name"]
