from .auth import hash_password
from .database import Base, SessionLocal, engine
from datetime import datetime, timedelta

from .models import (
    Category,
    Order,
    OrderItem,
    OrderStatusEnum,
    Product,
    RoleEnum,
    SupportMessage,
    SupportStatusEnum,
    User,
)

from slugify import slugify


def seed_database():
    """Seed the database with initial data if it's empty."""
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # Check if database is already seeded
        if db.query(User).first() is not None:
            print("Database already seeded, skipping...")
            return
        
        print("Seeding database...")
        
        # Admin user
        admin = User(
            name="Admin",
            email="admin@tarel.local",
            password_hash=hash_password("admin123"),
            role=RoleEnum.admin,
        )
        db.add(admin)
        db.flush()

        # Demo customer account
        customer = User(
            name="Nina Robertson",
            email="customer@tarel.local",
            password_hash=hash_password("customer123"),
            role=RoleEnum.user,
        )
        db.add(customer)
        db.flush()

        # Sample categories
        categories = ["Fresh Fish", "Dry Fish"]
        for name in categories:
            slug = slugify(name)
            db.add(Category(name=name, slug=slug))

        db.commit()

        # Sample products
        fresh = db.query(Category).filter_by(slug="fresh-fish").first()
        dry = db.query(Category).filter_by(slug="dry-fish").first()

        samples = [
            {
                "name": "Yellowfin Tuna",
                "slug": "yellowfin-tuna",
                "price_per_kg": 18.5,
                "stock_kg": 25,
                "is_dry": False,
                "category_id": fresh.id,
            },
            {
                "name": "King Fish (Seer)",
                "slug": "king-fish-seer",
                "price_per_kg": 22.0,
                "stock_kg": 18,
                "is_dry": False,
                "category_id": fresh.id,
            },
            {
                "name": "Dried Anchovies",
                "slug": "dried-anchovies",
                "price_per_kg": 12.0,
                "stock_kg": 40,
                "is_dry": True,
                "category_id": dry.id,
            },
        ]

        product_entities: list[Product] = []
        for product in samples:
            entity = Product(**product)
            db.add(entity)
            db.flush()
            product_entities.append(entity)

        # Create a showcase order for the demo customer
        order = Order(
            user_id=customer.id,
            total_amount=sum(p.price_per_kg * 1.5 for p in product_entities[:2]),
            status=OrderStatusEnum.delivered,
            delivery_slot="18:00 - 19:30",
            address_line="29 Seabreeze Walk",
            postcode="EH6 7DX",
            created_at=datetime.utcnow() - timedelta(days=3),
        )
        db.add(order)
        db.flush()

        for product in product_entities[:2]:
            db.add(
                OrderItem(
                    order_id=order.id,
                    product_id=product.id,
                    qty_kg=1.5,
                    price_per_kg=product.price_per_kg,
                )
            )

        # Provide a sample support message for context
        db.add(
            SupportMessage(
                user_id=customer.id,
                subject="Question about next-day delivery",
                message="Could you confirm if the Saturday deliveries arrive before noon?",
                response="Hi Nina! Saturday drop-offs land between 10am and noon across EH1-EH12.",
                status=SupportStatusEnum.closed,
                created_at=datetime.utcnow() - timedelta(days=2),
            )
        )

        db.commit()
        print("Database seeded successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


# Legacy: Keep the old script behavior for backwards compatibility
if __name__ == "__main__":
    db = SessionLocal()

    # Admin user
    admin = db.query(User).filter(User.email == "admin@tarel.local").first()
    if not admin:
        admin = User(
            name="Admin",
            email="admin@tarel.local",
            password_hash=hash_password("admin123"),
            role=RoleEnum.admin,
        )
        db.add(admin)
        db.flush()

    # Demo customer account
    customer = db.query(User).filter(User.email == "customer@tarel.local").first()
    if not customer:
        customer = User(
            name="Nina Robertson",
            email="customer@tarel.local",
            password_hash=hash_password("customer123"),
            role=RoleEnum.user,
        )
        db.add(customer)
        db.flush()

    # Sample categories
    # Remove legacy snacks category/product if present
    snacks_category = db.query(Category).filter(Category.slug == "snacks").first()
if snacks_category:
        db.query(Product).filter(Product.category_id == snacks_category.id).delete(synchronize_session=False)
        db.delete(snacks_category)
        db.commit()

    categories = ["Fresh Fish", "Dry Fish"]
    for name in categories:
        slug = slugify(name)
        if not db.query(Category).filter(Category.slug == slug).first():
            db.add(Category(name=name, slug=slug))

    db.commit()

    # Sample products
    fresh = db.query(Category).filter_by(slug="fresh-fish").first()
    dry = db.query(Category).filter_by(slug="dry-fish").first()

    samples = [
        {
            "name": "Yellowfin Tuna",
            "slug": "yellowfin-tuna",
            "price_per_kg": 18.5,
            "stock_kg": 25,
            "is_dry": False,
            "category_id": fresh.id,
        },
        {
            "name": "King Fish (Seer)",
            "slug": "king-fish-seer",
            "price_per_kg": 22.0,
            "stock_kg": 18,
            "is_dry": False,
            "category_id": fresh.id,
        },
        {
            "name": "Dried Anchovies",
            "slug": "dried-anchovies",
            "price_per_kg": 12.0,
            "stock_kg": 40,
            "is_dry": True,
            "category_id": dry.id,
        },
    ]

    product_entities: list[Product] = []
    for product in samples:
        existing = db.query(Product).filter_by(slug=product["slug"]).first()
        if existing:
            product_entities.append(existing)
            continue
        entity = Product(**product)
        db.add(entity)
        db.flush()
        product_entities.append(entity)

    # Create a showcase order for the demo customer
    if customer and not db.query(Order).filter(Order.user_id == customer.id).first():
        order = Order(
            user_id=customer.id,
            total_amount=sum(p.price_per_kg * 1.5 for p in product_entities[:2]),
            status=OrderStatusEnum.delivered,
            delivery_slot="18:00 - 19:30",
            address_line="29 Seabreeze Walk",
            postcode="EH6 7DX",
            created_at=datetime.utcnow() - timedelta(days=3),
        )
        db.add(order)
        db.flush()

        for product in product_entities[:2]:
            db.add(
                OrderItem(
                    order_id=order.id,
                    product_id=product.id,
                    qty_kg=1.5,
                    price_per_kg=product.price_per_kg,
                )
            )

    # Provide a sample support message for context
    if customer and not db.query(SupportMessage).filter(SupportMessage.user_id == customer.id).first():
        db.add(
            SupportMessage(
                user_id=customer.id,
                subject="Question about next-day delivery",
                message="Could you confirm if the Saturday deliveries arrive before noon?",
                response="Hi Nina! Saturday drop-offs land between 10am and noon across EH1-EH12.",
                status=SupportStatusEnum.closed,
                created_at=datetime.utcnow() - timedelta(days=2),
            )
        )

    db.commit()
    print("Seeded demo users, catalog, orders, and support threads!")
