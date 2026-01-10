from uuid import uuid4

from app.database import SessionLocal
from app.models import Category, Product


def _create_customer(client):
    payload = {
        "name": "Order Tester",
        "email": "order-tester@example.com",
        "password": "supersecret",
        "phone": "07000000000",
        "address_line1": "12 Harbour View",
        "locality": "Leith",
        "city": "Edinburgh",
        "postcode": "EH6 7AA",
    }
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 200
    return payload["email"], payload["password"]


def _login_headers(client, email: str, password: str) -> dict[str, str]:
    res = client.post(
        "/api/auth/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _create_product() -> tuple[str, str, float]:
    session = SessionLocal()
    try:
        category = Category(name=f"Shellfish {uuid4()}", slug=f"shellfish-{uuid4()}")
        product = Product(
            name="North Sea Haddock",
            slug=f"haddock-{uuid4()}",
            price_per_kg=14.5,
            stock_kg=25,
            category=category,
        )
        session.add_all([category, product])
        session.commit()
        session.refresh(product)
        return str(product.id), product.name, product.price_per_kg
    finally:
        session.close()


def test_user_can_view_and_cancel_orders(client):
    email, password = _create_customer(client)
    headers = _login_headers(client, email, password)
    product_id, product_name, price_per_kg = _create_product()

    order_res = client.post(
        "/api/orders/",
        json={
            "items": [{"product_id": product_id, "qty_kg": 2}],
            "address_line": "12 Harbour View",
            "postcode": "EH6 7AA",
            "delivery_slot": "Evening",
        },
        headers=headers,
    )
    assert order_res.status_code == 200
    order_payload = order_res.json()
    assert order_payload["status"] == "pending"
    assert order_payload["total_amount"] == price_per_kg * 2
    assert order_payload["items"], "Expected order items in response"
    assert order_payload["items"][0]["product"]["name"] == product_name
    order_id = order_payload["id"]

    list_res = client.get("/api/orders/my", headers=headers)
    assert list_res.status_code == 200
    orders = list_res.json()
    assert len(orders) == 1
    assert orders[0]["id"] == order_id
    assert orders[0]["items"][0]["product"]["name"] == product_name

    cancel_res = client.post(f"/api/orders/{order_id}/cancel", headers=headers)
    assert cancel_res.status_code == 200
    cancelled = cancel_res.json()
    assert cancelled["status"] == "cancelled"

    verify_res = client.get("/api/orders/my", headers=headers)
    assert verify_res.status_code == 200
    updated_orders = verify_res.json()
    assert updated_orders[0]["status"] == "cancelled"

    with SessionLocal() as session:
        product = session.query(Product).filter(Product.id == product_id).first()
        assert product is not None
        assert product.stock_kg == 25

    # Cancelling again should be idempotent
    second_cancel = client.post(f"/api/orders/{order_id}/cancel", headers=headers)
    assert second_cancel.status_code == 200
    assert second_cancel.json()["status"] == "cancelled"
