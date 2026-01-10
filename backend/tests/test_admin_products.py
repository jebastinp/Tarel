import io
from pathlib import Path

from app.auth import hash_password
from app.config import settings
from app.database import SessionLocal
from app.models import Category, RoleEnum, User


def _seed_admin_and_category():
    session = SessionLocal()
    password = "supersecret"
    try:
        admin = User(
            name="Automation Admin",
            email="admin@example.com",
            password_hash=hash_password(password),
            role=RoleEnum.admin,
        )
        category = Category(name="Seafood", slug="seafood", description=None)
        session.add(admin)
        session.add(category)
        session.commit()
        category_id = str(category.id)
        email = admin.email
    finally:
        session.close()
    return email, password, category_id


def _auth_headers(client):
    email, password, category_id = _seed_admin_and_category()
    response = client.post(
        "/api/auth/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}, category_id


def test_admin_can_crud_products(client):
    headers, category_id = _auth_headers(client)

    create_payload = {
        "name": "Atlantic Salmon",
        "slug": "atlantic-salmon",
        "price_per_kg": 14.5,
        "stock_kg": 120.0,
        "category_id": category_id,
        "description": "Rich and buttery fillets",
    }

    create_response = client.post("/api/admin/products", json=create_payload, headers=headers)
    assert create_response.status_code == 200
    created = create_response.json()
    assert created["name"] == "Atlantic Salmon"
    product_id = created["id"]

    list_response = client.get("/api/admin/products", headers=headers)
    assert list_response.status_code == 200
    products = list_response.json()
    assert any(p["id"] == product_id for p in products)

    update_response = client.patch(
        f"/api/admin/products/{product_id}",
        json={"price_per_kg": 16.0, "name": "Atlantic Salmon Prime"},
        headers=headers,
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["price_per_kg"] == 16.0
    assert updated["name"] == "Atlantic Salmon Prime"

    delete_response = client.delete(f"/api/admin/products/{product_id}", headers=headers)
    assert delete_response.status_code == 204

    list_after_delete = client.get("/api/admin/products", headers=headers)
    assert list_after_delete.status_code == 200
    assert all(p["id"] != product_id for p in list_after_delete.json())


def test_sales_report_not_supported_in_sqlite(client):
    headers, _ = _auth_headers(client)
    response = client.post(
        "/api/admin/actions/send-sales-report",
        json={"email": "ops@example.com"},
        headers=headers,
    )
    assert response.status_code == 501
    detail = response.json().get("detail", "").lower()
    assert "not configured" in detail or "501" in detail


def test_admin_can_upload_product_image(client):
    headers, _ = _auth_headers(client)
    payload = {
        "file": (
            "sample.png",
            io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"\x00" * 128),
            "image/png",
        )
    }

    response = client.post(
        "/api/admin/products/upload-image",
        headers=headers,
        files=payload,
    )

    assert response.status_code == 200
    data = response.json()
    assert "url" in data and data["url"]
    assert data.get("path", "").startswith("products/")

    stored_file = Path(settings.MEDIA_ROOT) / data["path"]
    assert stored_file.exists()
    assert stored_file.stat().st_size > 0

    stored_file.unlink()
