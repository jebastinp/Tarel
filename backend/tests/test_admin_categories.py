from uuid import uuid4

from app.auth import hash_password
from app.database import SessionLocal
from app.models import RoleEnum, User


def _seed_admin():
    session = SessionLocal()
    try:
        admin = User(
            name="Catalog Admin",
            email="catalog-admin@example.com",
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


def test_admin_can_manage_categories(client):
    headers = _admin_headers(client)

    slug = f"crustaceans-{uuid4()}"
    payload = {
        "name": "Crustaceans",
        "slug": slug,
        "description": "All shellfish and crustaceans",
    }

    create_res = client.post("/api/admin/categories", json=payload, headers=headers)
    assert create_res.status_code == 200
    created = create_res.json()
    assert created["slug"] == slug
    assert created["is_active"] is True

    list_res = client.get("/api/admin/categories", headers=headers)
    assert list_res.status_code == 200
    categories = list_res.json()
    assert any(cat["description"] == "All shellfish and crustaceans" for cat in categories)

    category_id = created["id"]
    update_res = client.patch(
        f"/api/admin/categories/{category_id}",
        json={"is_active": False, "description": "Updated description"},
        headers=headers,
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["is_active"] is False
    assert updated["description"] == "Updated description"
