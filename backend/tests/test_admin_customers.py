from uuid import uuid4

from app.auth import hash_password
from app.database import SessionLocal
from app.models import (
    Category,
    Order,
    OrderItem,
    OrderStatusEnum,
    Product,
    RoleEnum,
    User,
)


def _seed_admin():
    session = SessionLocal()
    try:
        admin = User(
            name="Analytics Admin",
            email="analytics-admin@example.com",
            password_hash=hash_password("supersecret"),
            role=RoleEnum.admin,
        )
        session.add(admin)
        session.commit()
        return admin.email, "supersecret"
    finally:
        session.close()


def _seed_customers():
    session = SessionLocal()
    customers = []
    try:
        category = Category(
            name="Ocean Harvest",
            slug=f"ocean-harvest-{uuid4().hex[:6]}",
            description="Seafood staples",
        )
        session.add(category)
        session.flush()

        product = Product(
            name="North Sea Salmon",
            slug=f"north-sea-salmon-{uuid4().hex[:6]}",
            description="Premium salmon fillet",
            price_per_kg=18.5,
            stock_kg=500,
            category_id=category.id,
            is_active=True,
        )
        session.add(product)
        session.flush()

        order_counts = [3, 1, 0]
        total_revenue = 0.0

        for index, count in enumerate(order_counts):
            customer = User(
                name=f"Customer {index}",
                email=f"customer{index}@example.com",
                password_hash=hash_password("password123"),
                role=RoleEnum.user,
            )
            session.add(customer)
            session.flush()

            for n in range(count):
                amount = 40.0 + index * 5 + n
                order = Order(
                    user_id=customer.id,
                    total_amount=amount,
                    status=OrderStatusEnum.paid,
                    delivery_slot="AM",
                    address_line="1 Market Street",
                    city="Edinburgh",
                    postcode="EH1 1AA",
                )
                session.add(order)
                session.flush()

                item = OrderItem(
                    order_id=order.id,
                    product_id=product.id,
                    qty_kg=1.0,
                    price_per_kg=amount,
                )
                session.add(item)
                total_revenue += amount

            customers.append({
                "id": customer.id,
                "order_count": count,
            })

        session.commit()
        return customers, sum(order_counts), total_revenue
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


def test_customers_endpoint_returns_paginated_data(client):
    seed, total_orders, total_revenue = _seed_customers()
    headers = _admin_headers(client)

    response = client.get(
        "/api/admin/customers",
        params={"page": 1, "page_size": 2, "sort": "order_count"},
        headers=headers,
    )
    assert response.status_code == 200
    payload = response.json()

    assert payload["total"] == len(seed)
    assert payload["metrics"]["total_customers"] == len(seed)
    assert payload["metrics"]["total_orders"] == total_orders
    assert abs(payload["metrics"]["total_revenue"] - total_revenue) < 1e-6
    assert len(payload["items"]) == 2
    assert payload["items"][0]["order_count"] >= payload["items"][1]["order_count"]


def test_customer_detail_endpoint_paginates_orders(client):
    seed, total_orders, _ = _seed_customers()
    richest = max(seed, key=lambda entry: entry["order_count"])
    headers = _admin_headers(client)

    response = client.get(
        f"/api/admin/customers/{richest['id']}",
        params={"order_page": 1, "order_page_size": 2},
        headers=headers,
    )
    assert response.status_code == 200
    detail = response.json()

    assert detail["customer"]["id"] == str(richest["id"])
    assert detail["customer"]["order_count"] == richest["order_count"]
    assert detail["orders"]["total"] == richest["order_count"]
    assert len(detail["orders"]["items"]) <= 2
    assert detail["orders"]["page"] == 1
    assert detail["orders"]["page_size"] == 2
    assert detail["orders"]["total_pages"] >= 1