from datetime import datetime


def _register_payload(
    email: str,
    name: str = "Test User",
    password: str = "super-secret",
    postcode: str = "EH16 4BQ",
):
    return {
        "name": name,
        "email": email,
        "password": password,
        "phone": "07000000000",
        "address_line1": "1 Test Street",
        "locality": "",
        "city": "Edinburgh",
        "postcode": postcode,
    }


def test_register_and_login_flow(client):
    register_payload = _register_payload("test-admin@tarel.local", name="Test Admin")
    res = client.post("/api/auth/register", json=register_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == register_payload["email"]

    res = client.post(
        "/api/auth/login",
        data={"username": register_payload["email"], "password": register_payload["password"]},
    )
    assert res.status_code == 200
    token_data = res.json()
    assert "access_token" in token_data
    assert token_data["user"]["email"] == register_payload["email"]


from app.auth import verify_password
from app.database import SessionLocal
from app.models import User


def test_duplicate_email_rejected(client):
    payload = _register_payload("dupe@tarel.local", name="Duplicate User", password="password123")
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 200
    with SessionLocal() as session:
        user = session.query(User).filter_by(email=payload["email"]).first()
        assert user is not None
        assert user.password_hash != payload["password"]
        assert verify_password(payload["password"], user.password_hash)

    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 400
    assert res.json()["detail"].lower().startswith("email")


def test_me_requires_auth_and_returns_profile(client):
    res = client.get("/api/auth/me")
    assert res.status_code == 401

    payload = _register_payload("profile-user@tarel.local", name="Profile User", password="password123")
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 200

    res = client.post(
        "/api/auth/login",
        data={"username": payload["email"], "password": payload["password"]},
    )
    assert res.status_code == 200
    token = res.json()["access_token"]

    res = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == payload["email"]
    assert data["name"] == payload["name"]


def test_update_me_allows_name_and_password_change(client):
    payload = _register_payload("profile-update@tarel.local", name="Initial Name", password="oldpassword")
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 200

    res = client.post(
        "/api/auth/login",
        data={"username": payload["email"], "password": payload["password"]},
    )
    assert res.status_code == 200
    token = res.json()["access_token"]

    res = client.patch(
        "/api/auth/me",
        json={"name": "Updated Name"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    assert res.json()["name"] == "Updated Name"

    new_password = "newpassword123"
    res = client.patch(
        "/api/auth/me",
        json={"password": new_password},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200

    res = client.post(
        "/api/auth/login",
        data={"username": payload["email"], "password": new_password},
    )
    assert res.status_code == 200


def test_update_me_rejects_blank_name(client):
    payload = _register_payload("blank-name@tarel.local", name="Another User", password="password123")
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 200

    res = client.post(
        "/api/auth/login",
        data={"username": payload["email"], "password": payload["password"]},
    )
    assert res.status_code == 200
    token = res.json()["access_token"]

    res = client.patch(
        "/api/auth/me",
        json={"name": "   "},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 422


def test_user_code_sequence_across_postcodes(client):
    year_suffix = datetime.utcnow().strftime("%y")

    first_payload = _register_payload("sequence1@tarel.local", postcode="EH16 4BQ")
    res = client.post("/api/auth/register", json=first_payload)
    assert res.status_code == 200
    first_code = res.json()["user_code"]
    assert first_code == f"ED{year_suffix}0001"

    second_payload = _register_payload("sequence2@tarel.local", postcode="EH16 4BQ")
    res = client.post("/api/auth/register", json=second_payload)
    assert res.status_code == 200
    second_code = res.json()["user_code"]
    assert second_code == f"ED{year_suffix}0002"

    third_payload = _register_payload("sequence3@tarel.local", postcode="G69 6DZ")
    res = client.post("/api/auth/register", json=third_payload)
    assert res.status_code == 200
    third_code = res.json()["user_code"]
    assert third_code == f"GL{year_suffix}0003"

    fourth_payload = _register_payload("sequence4@tarel.local", postcode="FK14 7AS")
    res = client.post("/api/auth/register", json=fourth_payload)
    assert res.status_code == 200
    fourth_code = res.json()["user_code"]
    assert fourth_code == f"FA{year_suffix}0004"
