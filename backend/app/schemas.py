from datetime import date, datetime, timezone
import re
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from .models import OrderStatusEnum, RoleEnum, SupportStatusEnum

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _validate_email(value: str) -> str:
    if not isinstance(value, str):
        raise TypeError("email must be a string")

    email = value.strip().lower()
    if not EMAIL_PATTERN.match(email):
        raise ValueError("Invalid email address")

    return email


class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    phone: str
    address_line1: str
    locality: Optional[str] = None
    city: str
    postcode: str

    @field_validator("email")
    @classmethod
    def user_create_email(cls, value: str) -> str:
        return _validate_email(value)

    @field_validator("name", "phone", "address_line1", "city", "postcode")
    @classmethod
    def strip_non_empty(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Field cannot be empty")
        return value

    @field_validator("postcode")
    @classmethod
    def normalise_postcode(cls, value: str) -> str:
        return value.strip().upper()


class UserOut(BaseModel):
    id: UUID
    name: str
    email: str
    role: RoleEnum
    created_at: datetime
    phone: Optional[str]
    address_line1: Optional[str]
    locality: Optional[str]
    city: Optional[str]
    postcode: Optional[str]
    user_code: Optional[str]

    class Config:
        from_attributes = True

    @field_validator("email")
    @classmethod
    def user_out_email(cls, value: str) -> str:
        return _validate_email(value)


class UserUpdate(BaseModel):
    name: Optional[str] = None
    password: Optional[str] = Field(default=None, min_length=8)

    @field_validator("name")
    @classmethod
    def user_update_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        name = value.strip()
        if not name:
            raise ValueError("Name cannot be empty")
        return name


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class CategoryCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None


class CategoryOut(BaseModel):
    id: UUID
    name: str
    slug: str
    description: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ProductCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str]
    price_per_kg: float
    image_url: Optional[str]
    stock_kg: float
    is_dry: bool = False
    category_id: UUID


class ProductOut(BaseModel):
    id: UUID
    name: str
    slug: str
    description: Optional[str]
    price_per_kg: float
    image_url: Optional[str]
    stock_kg: float
    is_dry: bool
    is_active: bool
    category: CategoryOut

    class Config:
        from_attributes = True


class ProductAdminCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    price_per_kg: float
    stock_kg: float
    category_id: UUID
    image_url: Optional[str] = None
    is_active: bool = True
    is_dry: bool = False


class ProductAdminUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    price_per_kg: Optional[float] = None
    stock_kg: Optional[float] = None
    category_id: Optional[UUID] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None
    is_dry: Optional[bool] = None


class OrderItemIn(BaseModel):
    product_id: UUID
    qty_kg: float = Field(gt=0)


class OrderCreate(BaseModel):
    items: List[OrderItemIn]
    address_line: str
    postcode: str
    delivery_slot: str


class ProductSummary(BaseModel):
    id: UUID
    name: str
    slug: str

    class Config:
        from_attributes = True


class OrderItemOut(BaseModel):
    product_id: UUID
    qty_kg: float
    price_per_kg: float
    product: ProductSummary

    class Config:
        from_attributes = True


class OrderOut(BaseModel):
    id: UUID
    total_amount: float
    status: OrderStatusEnum
    delivery_slot: str
    address_line: str
    city: str
    postcode: str
    created_at: datetime
    items: List[OrderItemOut]

    class Config:
        from_attributes = True


class OrderItemAdminOut(BaseModel):
    id: UUID
    qty_kg: float
    price_per_kg: float
    product: ProductSummary

    class Config:
        from_attributes = True


class OrderAdminOut(BaseModel):
    id: UUID
    total_amount: float
    status: OrderStatusEnum
    delivery_slot: Optional[str]
    address_line: str
    city: str
    postcode: str
    created_at: datetime
    user: UserOut
    items: List[OrderItemAdminOut]

    class Config:
        from_attributes = True


class SupportMessageCreate(BaseModel):
    subject: str
    message: str


class SupportMessageOut(BaseModel):
    id: UUID
    subject: str
    message: str
    response: Optional[str]
    status: SupportStatusEnum
    created_at: datetime

    class Config:
        from_attributes = True


class SupportMessageAdminOut(SupportMessageOut):
    user: UserOut


class SupportMessageAdminUpdate(BaseModel):
    response: Optional[str] = None
    status: SupportStatusEnum


class OrderStatusUpdate(BaseModel):
    status: OrderStatusEnum


class SalesReportRequest(BaseModel):
    email: Optional[str] = None

    @field_validator("email")
    @classmethod
    def sales_report_email(cls, value: Optional[str]) -> Optional[str]:
        if value is None or value == "":
            return None
        return _validate_email(value)


class CustomerSummary(BaseModel):
    id: UUID
    name: str
    email: str
    created_at: datetime
    order_count: int
    total_spend: float
    last_order_at: Optional[datetime]

    class Config:
        from_attributes = True


class CustomerMetrics(BaseModel):
    total_customers: int
    total_orders: int
    total_revenue: float


class PaginatedCustomers(BaseModel):
    items: List[CustomerSummary]
    total: int
    page: int
    page_size: int
    total_pages: int
    metrics: CustomerMetrics


class PaginatedOrders(BaseModel):
    items: List[OrderAdminOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class CustomerDetailOut(BaseModel):
    customer: CustomerSummary
    orders: PaginatedOrders


class NextDeliveryUpdate(BaseModel):
    scheduled_for: Optional[date] = None
    cutoff_at: Optional[datetime] = None
    window_label: Optional[str] = Field(default=None, max_length=80)

    @field_validator("scheduled_for")
    @classmethod
    def next_delivery_future(cls, value: Optional[date]) -> Optional[date]:
        if value is None:
            return None
        if value < date.today():
            raise ValueError("Delivery date cannot be in the past")
        return value

    @field_validator("cutoff_at")
    @classmethod
    def next_delivery_cutoff_future(cls, value: Optional[datetime]) -> Optional[datetime]:
        if value is None:
            return None
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        current = datetime.now(timezone.utc)
        if value <= current:
            raise ValueError("Cutoff time must be in the future")
        return value

    @field_validator("window_label")
    @classmethod
    def next_delivery_label(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        label = value.strip()
        if not label:
            return None
        return label


class NextDeliveryResponse(BaseModel):
    scheduled_for: Optional[date]
    cutoff_at: Optional[datetime]
    window_label: Optional[str]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# Vendor Report Schemas
class VendorReportProductItem(BaseModel):
    product_name: str
    total_qty_kg: float

class VendorReportInstruction(BaseModel):
    order_id: UUID
    customer_name: str
    notes: str

class VendorReportOut(BaseModel):
    delivery_date: date
    total_orders: int
    total_kg: float
    total_items: int
    products: List[VendorReportProductItem]
    instructions: List[VendorReportInstruction]
