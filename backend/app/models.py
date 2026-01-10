from datetime import datetime
import enum
import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship
from sqlalchemy.types import CHAR, TypeDecorator

from .database import Base


class GUID(TypeDecorator):
    """Platform-independent GUID/UUID type.

    Uses PostgreSQL's UUID type, otherwise stores as CHAR(36).
    """

    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if isinstance(value, uuid.UUID):
            return value if dialect.name == "postgresql" else str(value)
        try:
            coerced = uuid.UUID(str(value))
        except (TypeError, ValueError) as exc:
            raise ValueError("Invalid UUID value") from exc
        return coerced if dialect.name == "postgresql" else str(coerced)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if isinstance(value, uuid.UUID):
            return value
        return uuid.UUID(str(value))


class RoleEnum(str, enum.Enum):
    user = "user"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(GUID, primary_key=True, index=True, default=uuid.uuid4)
    name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(RoleEnum), default=RoleEnum.user, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    phone = Column(String(30), nullable=True)
    address_line1 = Column(String(255), nullable=True)
    locality = Column(String(120), nullable=True)
    city = Column(String(120), nullable=True)
    postcode = Column(String(12), nullable=True)
    user_code = Column(String(16), unique=True, nullable=True)

    orders = relationship("Order", back_populates="user")


class Category(Base):
    __tablename__ = "categories"

    id = Column(GUID, primary_key=True, index=True, default=uuid.uuid4)
    name = Column(String(120), unique=True, nullable=False)
    slug = Column(String(140), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)

    products = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products"

    id = Column(GUID, primary_key=True, index=True, default=uuid.uuid4)
    name = Column(String(160), nullable=False)
    slug = Column(String(180), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    price_per_kg = Column(Float, nullable=False)
    image_url = Column(String(500), nullable=True)
    stock_kg = Column(Float, default=0)
    is_dry = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    category_id = Column(GUID, ForeignKey("categories.id"), nullable=False)

    category = relationship("Category", back_populates="products")
    order_items = relationship("OrderItem", back_populates="product")


class OrderStatusEnum(str, enum.Enum):
    pending = "pending"
    paid = "paid"
    processing = "processing"
    out_for_delivery = "out_for_delivery"
    delivered = "delivered"
    cancelled = "cancelled"


class Order(Base):
    __tablename__ = "orders"

    id = Column(GUID, primary_key=True, index=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id"), nullable=False)
    total_amount = Column(Float, nullable=False)
    status = Column(Enum(OrderStatusEnum), default=OrderStatusEnum.pending)
    delivery_slot = Column(String(50), nullable=True)
    address_line = Column(String(255), nullable=False)
    city = Column(String(120), default="Edinburgh")
    postcode = Column(String(12), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order")




class SupportStatusEnum(str, enum.Enum):
    open = "open"
    pending = "pending"
    closed = "closed"


class SupportMessage(Base):
    __tablename__ = "support_messages"

    id = Column(GUID, primary_key=True, index=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id"), nullable=False)
    subject = Column(String(160), nullable=False)
    message = Column(Text, nullable=False)
    response = Column(Text, nullable=True)
    status = Column(Enum(SupportStatusEnum), default=SupportStatusEnum.open, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(GUID, primary_key=True, index=True, default=uuid.uuid4)
    order_id = Column(GUID, ForeignKey("orders.id"), nullable=False)
    product_id = Column(GUID, ForeignKey("products.id"), nullable=False)
    qty_kg = Column(Float, nullable=False)
    price_per_kg = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")


class SiteSetting(Base):
    __tablename__ = "site_settings"

    key = Column(String(120), primary_key=True)
    value = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
