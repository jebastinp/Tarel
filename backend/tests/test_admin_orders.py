from uuid import uuid4

from app.auth import hash_password
from app.database import SessionLocal
from app.models import Category, Order, OrderItem, Product, RoleEnum, User


def _bootstrap_order():
    session = SessionLocal()
    try:
        admin_email = "orders-admin@example.com"
        customer_email = "customer@example.com"

        admin = User(
            name="Orders Admin",
            email=admin_email,
            password_hash=hash_password("supersecret"),
            role=RoleEnum.admin,
        )
        customer = User(
            name="Customer One",
            email=customer_email,
            password_hash=hash_password("customerpass"),
            role=RoleEnum.user,
        )
        category = Category(name="Shellfish", slug=f"shellfish-{uuid4()}", description=None)
        product = Product(
            name="Tiger Prawns",
            slug=f"tiger-prawns-{uuid4()}",
            price_per_kg=19.5,
            stock_kg=50,
            category=category,
        )

        order = Order(
            user=customer,
            total_amount=39.0,
            delivery_slot="Morning",
            address_line="12 Ocean Street",
            city="Edinburgh",
            postcode="EH1 2AB",
        )
        item = OrderItem(
            order=order,
            product=product,
            qty_kg=2,
            price_per_kg=19.5,
        )

        session.add_all([admin, customer, category, product, order, item])
        session.commit()

        session.refresh(order)
        return admin_email, "supersecret", str(order.id), str(product.id)
    finally:
        session.close()


def _admin_headers(client):
    email, password, order_id, product_id = _bootstrap_order()
    res = client.post(
        "/api/auth/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}, order_id, product_id


def test_orders_list_includes_details(client):
    headers, order_id, product_id = _admin_headers(client)
    res = client.get("/api/admin/orders", headers=headers)
    assert res.status_code == 200
    payload = res.json()
    assert len(payload) >= 1

    order = payload[0]
    assert order["id"] == order_id
    assert order["user"]["email"].endswith("@example.com")
    assert order["items"], "expected order items to be present"
    item = order["items"][0]
    assert item["product"]["id"] == product_id
    assert "name" in item["product"]
    assert item["qty_kg"] == 2


def test_order_detail_endpoint(client):
    headers, order_id, _ = _admin_headers(client)
    res = client.get(f"/api/admin/orders/{order_id}", headers=headers)
    assert res.status_code == 200
    order = res.json()
    assert order["id"] == order_id
    assert order["user"]["name"] == "Customer One"
    assert len(order["items"]) == 1
    assert order["items"][0]["product"]["name"] == "Tiger Prawns"


def test_admin_can_update_order_status(client):
    headers, order_id, _ = _admin_headers(client)
    update_res = client.patch(
        f"/api/admin/orders/{order_id}/status",
        json={"status": "processing"},
        headers=headers,
    )
    assert update_res.status_code == 200
    payload = update_res.json()
    assert payload["ok"] is True

    detail_res = client.get(f"/api/admin/orders/{order_id}", headers=headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["status"] == "processing"