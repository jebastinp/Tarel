from datetime import date, datetime, timedelta, timezone

from app.auth import hash_password
from app.database import SessionLocal
from app.models import RoleEnum, User


def _seed_admin():
    session = SessionLocal()
    try:
        admin = User(
            name="Site Ops",
            email="site-ops@example.com",
            password_hash=hash_password("supersecret"),
            role=RoleEnum.admin,
        )
        session.add(admin)
        session.commit()
        return admin.email, "supersecret"
    finally:
        session.close()


def _auth_headers(client):
    email, password = _seed_admin()
    response = client.post(
        "/api/auth/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_admin_can_update_next_delivery(client):
    headers = _auth_headers(client)
    next_wednesday = date.today() + timedelta(days=7)
    cutoff_at = datetime.utcnow() + timedelta(days=5, hours=2)
    window_label = "Weekend window"

    put_res = client.put(
        "/api/admin/site/next-delivery",
        json={
            "scheduled_for": next_wednesday.isoformat(),
            "cutoff_at": cutoff_at.isoformat(),
            "window_label": window_label,
        },
        headers=headers,
    )
    assert put_res.status_code == 200
    payload = put_res.json()
    assert payload["scheduled_for"] == next_wednesday.isoformat()
    expected_cutoff = cutoff_at.replace(tzinfo=timezone.utc)
    received_cutoff = datetime.fromisoformat(payload["cutoff_at"].replace("Z", "+00:00"))
    assert received_cutoff == expected_cutoff
    assert payload["window_label"] == window_label
    assert payload["updated_at"] is not None

    get_res = client.get("/api/admin/site/next-delivery", headers=headers)
    assert get_res.status_code == 200
    admin_payload = get_res.json()
    assert admin_payload["scheduled_for"] == next_wednesday.isoformat()
    admin_cutoff = datetime.fromisoformat(admin_payload["cutoff_at"].replace("Z", "+00:00"))
    assert admin_cutoff == expected_cutoff
    assert admin_payload["window_label"] == window_label

    public_res = client.get("/api/site/next-delivery")
    assert public_res.status_code == 200
    public_payload = public_res.json()
    assert public_payload == admin_payload


def test_admin_can_clear_next_delivery(client):
    headers = _auth_headers(client)

    # Set value first
    client.put(
        "/api/admin/site/next-delivery",
        json={"scheduled_for": (date.today() + timedelta(days=3)).isoformat()},
        headers=headers,
    )

    clear_res = client.put(
        "/api/admin/site/next-delivery",
        json={"scheduled_for": None, "cutoff_at": None, "window_label": None},
        headers=headers,
    )
    assert clear_res.status_code == 200
    cleared = clear_res.json()
    assert cleared["scheduled_for"] is None
    assert cleared["cutoff_at"] is None
    assert cleared["window_label"] is None

    public_res = client.get("/api/site/next-delivery")
    assert public_res.status_code == 200
    public_payload = public_res.json()
    assert public_payload["scheduled_for"] is None
    assert public_payload["cutoff_at"] is None
    assert public_payload["window_label"] is None