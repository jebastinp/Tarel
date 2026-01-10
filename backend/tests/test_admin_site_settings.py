import json
from datetime import date, datetime, timedelta, timezone

from app.auth import hash_password
from app.database import SessionLocal
from app.models import RoleEnum, SiteSetting, User


def _normalize_iso(value: str) -> str:
    return (
        datetime.fromisoformat(value.replace("Z", "+00:00"))
        .astimezone(timezone.utc)
        .isoformat()
        .replace("+00:00", "Z")
    )


def _seed_admin():
    session = SessionLocal()
    try:
        admin = User(
            name="Settings Admin",
            email="settings-admin@example.com",
            password_hash=hash_password("supersecret"),
            role=RoleEnum.admin,
        )
        session.add(admin)
        session.commit()
        return admin.email, "supersecret"
    finally:
        session.close()


def _admin_headers(client):
    email, password = _seed_admin()
    response = client.post(
        "/api/auth/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_admin_can_set_next_delivery(client):
    headers = _admin_headers(client)
    target_date = date.today() + timedelta(days=5)
    cutoff_at = datetime.now(timezone.utc) + timedelta(days=4)
    expected_cutoff = cutoff_at.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    window_label = "Weekday deliveries"

    update = client.put(
        "/api/admin/site/next-delivery",
        json={
            "scheduled_for": target_date.isoformat(),
            "cutoff_at": cutoff_at.isoformat(),
            "window_label": window_label,
        },
        headers=headers,
    )
    assert update.status_code == 200
    payload = update.json()
    assert payload["scheduled_for"] == target_date.isoformat()
    assert _normalize_iso(payload["cutoff_at"]) == expected_cutoff
    assert payload["window_label"] == window_label

    public = client.get("/api/site/next-delivery")
    assert public.status_code == 200
    public_payload = public.json()
    assert public_payload["scheduled_for"] == target_date.isoformat()
    assert _normalize_iso(public_payload["cutoff_at"]) == expected_cutoff
    assert public_payload["window_label"] == window_label

    session = SessionLocal()
    try:
        setting = session.query(SiteSetting).filter(SiteSetting.key == "next_delivery_settings").first()
        assert setting is not None
        stored = json.loads(setting.value)
        assert stored["scheduled_for"] == target_date.isoformat()
        assert _normalize_iso(stored["cutoff_at"]) == expected_cutoff
        assert stored["window_label"] == window_label
    finally:
        session.close()


def test_admin_can_clear_next_delivery(client):
    headers = _admin_headers(client)

    update = client.put(
        "/api/admin/site/next-delivery",
        json={"scheduled_for": None, "cutoff_at": None, "window_label": None},
        headers=headers,
    )
    assert update.status_code == 200
    payload = update.json()
    assert payload["scheduled_for"] is None
    assert payload["cutoff_at"] is None
    assert payload["window_label"] is None

    public = client.get("/api/site/next-delivery")
    assert public.status_code == 200
    public_payload = public.json()
    assert public_payload["scheduled_for"] is None
    assert public_payload["cutoff_at"] is None
    assert public_payload["window_label"] is None
