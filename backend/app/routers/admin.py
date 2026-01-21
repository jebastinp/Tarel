import logging
import mimetypes
import shutil
import uuid
from pathlib import Path
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from math import ceil
from sqlalchemy import asc, desc, func, or_
from sqlalchemy.orm import Session, selectinload
import cloudinary
import cloudinary.uploader

from ..database import get_db
from ..deps import require_admin
from ..models import (
    Category,
    CutCleanOption,
    Order,
    OrderItem,
    Product,
    RoleEnum,
    SupportMessage,
    User,
)
from ..schemas import (
    CategoryCreate,
    CategoryUpdate,
    CutCleanOptionCreate,
    CutCleanOptionOut,
    CutCleanOptionUpdate,
    CustomerDetailOut,
    NextDeliveryResponse,
    NextDeliveryUpdate,
    PaginatedCustomers,
    OrderAdminOut,
    OrderStatusUpdate,
    ProductAdminCreate,
    ProductAdminUpdate,
    SalesReportRequest,
    SupportMessageAdminUpdate,
    VendorReportOut,
    VendorReportProductItem,
    VendorReportInstruction,
)
from ..config import settings
from ..site_settings import get_next_delivery, set_next_delivery

logger = logging.getLogger("tarel.admin")

router = APIRouter(prefix="/admin", tags=["admin"])

MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


# Helpers
def _serialize_category(category: Category) -> dict:
    return {
        "id": category.id,
        "name": category.name,
        "slug": category.slug,
        "description": category.description,
        "is_active": category.is_active,
    }


def _serialize_product(product: Product) -> dict:
    return {
        "id": product.id,
        "name": product.name,
        "slug": product.slug,
        "description": product.description,
        "price_per_kg": product.price_per_kg,
        "stock_kg": product.stock_kg,
        "is_active": product.is_active,
        "image_url": product.image_url,
        "is_dry": product.is_dry,
        "category_id": product.category_id,
        "category": {
            "id": product.category.id,
            "name": product.category.name,
        }
        if product.category
        else None,
    }


def _ensure_products_media_dir() -> Path:
    base_path = Path(settings.MEDIA_ROOT)
    target = base_path / "products"
    target.mkdir(parents=True, exist_ok=True)
    return target


def _resolve_image_extension(content_type: Optional[str]) -> str:
    if not content_type:
        raise HTTPException(status_code=400, detail="Missing content type for image upload")
    allowed = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
    }
    ext = allowed.get(content_type)
    if not ext:
        guessed = mimetypes.guess_extension(content_type) or ""
        guessed = guessed.replace(".jpe", ".jpg") if guessed == ".jpe" else guessed
        if guessed.lower() in {".jpg", ".jpeg", ".png", ".gif", ".webp"}:
            ext = ".jpg" if guessed.lower() in {".jpeg", ".jpe"} else guessed.lower()
    if not ext:
        raise HTTPException(status_code=400, detail="Unsupported image type. Use PNG, JPG, WEBP, or GIF.")
    return ext


@router.post("/products/upload-image")
def upload_product_image(
    request: Request,
    file: UploadFile = File(...),
    admin=Depends(require_admin),
):
    del admin
    extension = _resolve_image_extension(file.content_type)
    
    # Use Cloudinary if configured
    if settings.USE_CLOUDINARY and settings.CLOUDINARY_CLOUD_NAME:
        try:
            # Configure Cloudinary
            cloudinary.config(
                cloud_name=settings.CLOUDINARY_CLOUD_NAME,
                api_key=settings.CLOUDINARY_API_KEY,
                api_secret=settings.CLOUDINARY_API_SECRET,
                secure=True
            )
            
            # Upload to Cloudinary (without transformation during upload)
            filename = f"{uuid.uuid4().hex}"
            result = cloudinary.uploader.upload(
                file.file,
                folder="tarel/products",
                public_id=filename,
                resource_type="image"
            )
            
            # Build URL with transformation applied on delivery
            base_url = result["secure_url"]
            # Cloudinary will optimize on-the-fly when requested
            
            return {
                "url": base_url,
                "path": result["public_id"],
                "filename": filename,
                "content_type": file.content_type,
                "size": result.get("bytes", 0),
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload to Cloudinary: {str(e)}")
        finally:
            file.file.close()
    
    # Fallback to local storage (for development)
    media_dir = _ensure_products_media_dir()
    filename = f"{uuid.uuid4().hex}{extension}"
    destination = media_dir / filename

    total = 0
    try:
        with destination.open("wb") as buffer:
            while True:
                chunk = file.file.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > MAX_IMAGE_SIZE_BYTES:
                    raise HTTPException(status_code=400, detail="Image exceeds 5 MB limit")
                buffer.write(chunk)
    except HTTPException:
        if destination.exists():
            destination.unlink()
        raise
    finally:
        file.file.close()

    public_url = request.url_for("media", path=f"products/{filename}")
    return {
        "url": str(public_url),
        "path": f"products/{filename}",
        "filename": filename,
        "content_type": file.content_type,
        "size": total,
    }


# ============ USERS ============
@router.get("/users", response_model=List[dict])
def all_users(db: Session = Depends(get_db), admin=Depends(require_admin)):
    del admin
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [
        {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "created_at": user.created_at,
        }
        for user in users
    ]


@router.get("/site/next-delivery", response_model=NextDeliveryResponse)
def admin_get_next_delivery(db: Session = Depends(get_db), admin=Depends(require_admin)):
    del admin
    return get_next_delivery(db)


@router.put("/site/next-delivery", response_model=NextDeliveryResponse)
def admin_update_next_delivery(
    payload: NextDeliveryUpdate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    del admin
    return set_next_delivery(
        db,
        payload.scheduled_for,
        payload.cutoff_at,
        payload.window_label,
    )


@router.get("/customers", response_model=PaginatedCustomers)
def list_customers(
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    sort: str = Query("recent_order"),
    search: Optional[str] = Query(None),
):
    del admin

    filters = [User.role == RoleEnum.user]

    if search:
        pattern = f"%{search.strip()}%"
        filters.append(or_(User.name.ilike(pattern), User.email.ilike(pattern)))

    total_customers = (
        db.query(func.count(User.id))
        .filter(*filters)
        .scalar()
    ) or 0

    total_orders = (
        db.query(func.count(Order.id))
        .join(User, User.id == Order.user_id)
        .filter(*filters)
        .scalar()
    ) or 0

    total_revenue = (
        db.query(func.coalesce(func.sum(Order.total_amount), 0.0))
        .join(User, User.id == Order.user_id)
        .filter(*filters)
        .scalar()
    ) or 0.0

    stats_subquery = (
        db.query(
            Order.user_id.label("user_id"),
            func.count(Order.id).label("order_count"),
            func.coalesce(func.sum(Order.total_amount), 0.0).label("total_spend"),
            func.max(Order.created_at).label("last_order_at"),
        )
        .group_by(Order.user_id)
        .subquery()
    )

    last_activity = func.coalesce(stats_subquery.c.last_order_at, User.created_at)

    query = (
        db.query(
            User.id,
            User.name,
            User.email,
            User.created_at,
            func.coalesce(stats_subquery.c.order_count, 0).label("order_count"),
            func.coalesce(stats_subquery.c.total_spend, 0.0).label("total_spend"),
            stats_subquery.c.last_order_at,
        )
        .outerjoin(stats_subquery, stats_subquery.c.user_id == User.id)
        .filter(*filters)
    )

    sort = sort or "recent_order"
    if sort == "name_asc":
        query = query.order_by(asc(func.lower(User.name)))
    elif sort == "name_desc":
        query = query.order_by(desc(func.lower(User.name)))
    elif sort == "order_count":
        query = query.order_by(desc(func.coalesce(stats_subquery.c.order_count, 0)), desc(User.created_at))
    elif sort == "total_spend":
        query = query.order_by(desc(func.coalesce(stats_subquery.c.total_spend, 0.0)), desc(User.created_at))
    else:
        query = query.order_by(desc(last_activity), desc(User.created_at))

    total_pages = ceil(total_customers / page_size) if total_customers else 0
    if total_pages and page > total_pages:
        page = total_pages
    if page < 1:
        page = 1

    offset = (page - 1) * page_size
    rows = query.offset(offset).limit(page_size).all()

    items = [
        {
            "id": row.id,
            "name": row.name,
            "email": row.email,
            "created_at": row.created_at,
            "order_count": int(row.order_count or 0),
            "total_spend": float(row.total_spend or 0.0),
            "last_order_at": row.last_order_at,
        }
        for row in rows
    ]

    return {
        "items": items,
        "total": total_customers,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "metrics": {
            "total_customers": total_customers,
            "total_orders": total_orders,
            "total_revenue": float(total_revenue or 0.0),
        },
    }


@router.get("/customers/{user_id}", response_model=CustomerDetailOut)
def customer_detail(
    user_id: UUID,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
    order_page: int = Query(1, ge=1),
    order_page_size: int = Query(10, ge=1, le=100),
):
    del admin

    customer = (
        db.query(User)
        .filter(User.id == user_id, User.role == RoleEnum.user)
        .first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    order_count, total_spend, last_order_at = (
        db.query(
            func.count(Order.id),
            func.coalesce(func.sum(Order.total_amount), 0.0),
            func.max(Order.created_at),
        )
        .filter(Order.user_id == user_id)
        .first()
    )

    orders_total = (
        db.query(func.count(Order.id))
        .filter(Order.user_id == user_id)
        .scalar()
    ) or 0

    total_pages = ceil(orders_total / order_page_size) if orders_total else 0
    if total_pages and order_page > total_pages:
        order_page = total_pages
    if order_page < 1:
        order_page = 1

    orders_query = (
        db.query(Order)
        .options(
            selectinload(Order.items).selectinload(OrderItem.product),
            selectinload(Order.user),
        )
        .filter(Order.user_id == user_id)
        .order_by(Order.created_at.desc())
    )

    orders = (
        orders_query
        .offset((order_page - 1) * order_page_size)
        .limit(order_page_size)
        .all()
    )

    return {
        "customer": {
            "id": customer.id,
            "name": customer.name,
            "email": customer.email,
            "created_at": customer.created_at,
            "order_count": int(order_count or 0),
            "total_spend": float(total_spend or 0.0),
            "last_order_at": last_order_at,
        },
        "orders": {
            "items": orders,
            "total": orders_total,
            "page": order_page,
            "page_size": order_page_size,
            "total_pages": total_pages,
        },
    }


@router.patch("/users/{user_id}/role")
def change_user_role(
    user_id: UUID,
    role: RoleEnum,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    del admin
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = role
    db.commit()
    return {"ok": True}


# ============ CATEGORIES ============
@router.get("/categories", response_model=List[dict])
def all_categories(db: Session = Depends(get_db), admin=Depends(require_admin)):
    del admin
    categories = db.query(Category).order_by(Category.name.asc()).all()
    return [_serialize_category(category) for category in categories]


@router.post("/categories")
def create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    del admin
    exists = db.query(Category).filter(Category.slug == payload.slug).first()
    if exists:
        raise HTTPException(status_code=400, detail="Slug already exists")
    category = Category(name=payload.name, slug=payload.slug, description=payload.description)
    db.add(category)
    db.commit()
    db.refresh(category)
    return _serialize_category(category)


@router.patch("/categories/{category_id}")
def update_category(
    category_id: UUID,
    payload: CategoryUpdate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    del admin
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    if payload.slug and payload.slug != category.slug:
        exists = db.query(Category).filter(Category.slug == payload.slug).first()
        if exists:
            raise HTTPException(status_code=400, detail="Slug already exists")
        category.slug = payload.slug

    if payload.name is not None:
        category.name = payload.name
    if payload.description is not None:
        category.description = payload.description
    if payload.is_active is not None:
        category.is_active = payload.is_active

    db.commit()
    db.refresh(category)
    return _serialize_category(category)


@router.delete("/categories/{category_id}")
def delete_category(
    category_id: UUID,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    del admin
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    if category.products:
        raise HTTPException(status_code=400, detail="Cannot delete category with products")
    db.delete(category)
    db.commit()
    return {"ok": True}


# ============ PRODUCTS ============
@router.get("/products", response_model=List[dict])
def all_products(db: Session = Depends(get_db), admin=Depends(require_admin)):
    del admin
    products = db.query(Product).order_by(Product.id.desc()).all()
    return [_serialize_product(product) for product in products]


@router.post("/products")
def add_product(
    payload: ProductAdminCreate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    del admin
    exists = db.query(Product).filter(Product.slug == payload.slug).first()
    if exists:
        raise HTTPException(status_code=400, detail="Slug already exists")
    category = db.query(Category).filter(Category.id == payload.category_id).first()
    if not category:
        raise HTTPException(status_code=400, detail="Invalid category")
    product = Product(
        name=payload.name,
        slug=payload.slug,
        price_per_kg=payload.price_per_kg,
        stock_kg=payload.stock_kg,
        category_id=payload.category_id,
        description=payload.description,
        image_url=payload.image_url,
        is_active=payload.is_active,
        is_dry=payload.is_dry,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return _serialize_product(product)


@router.patch("/products/{product_id}")
def edit_product(
    product_id: UUID,
    payload: ProductAdminUpdate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    del admin
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if payload.slug and payload.slug != product.slug:
        exists = db.query(Product).filter(Product.slug == payload.slug).first()
        if exists:
            raise HTTPException(status_code=400, detail="Slug already exists")
        product.slug = payload.slug

    if payload.category_id is not None and payload.category_id != product.category_id:
        category = (
            db.query(Category).filter(Category.id == payload.category_id).first()
        )
        if not category:
            raise HTTPException(status_code=400, detail="Invalid category")
        product.category_id = payload.category_id

    if payload.name is not None:
        product.name = payload.name
    if payload.description is not None:
        product.description = payload.description
    if payload.price_per_kg is not None:
        product.price_per_kg = payload.price_per_kg
    if payload.stock_kg is not None:
        product.stock_kg = payload.stock_kg
    if payload.image_url is not None:
        product.image_url = payload.image_url
    if payload.is_active is not None:
        product.is_active = payload.is_active
    if payload.is_dry is not None:
        product.is_dry = payload.is_dry

    db.commit()
    db.refresh(product)
    return _serialize_product(product)


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: UUID,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    del admin
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()


# ============ ORDERS ============
@router.get("/orders", response_model=List[OrderAdminOut])
def all_orders(db: Session = Depends(get_db), admin=Depends(require_admin)):
    del admin
    orders = (
        db.query(Order)
        .options(
            selectinload(Order.user),
            selectinload(Order.items).selectinload(OrderItem.product),
        )
        .order_by(Order.created_at.desc())
        .all()
    )
    return orders


@router.get("/orders/{order_id}", response_model=OrderAdminOut)
def get_order(order_id: UUID, db: Session = Depends(get_db), admin=Depends(require_admin)):
    del admin
    order = (
        db.query(Order)
        .options(
            selectinload(Order.user),
            selectinload(Order.items).selectinload(OrderItem.product),
        )
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.patch("/orders/{order_id}/status")
def update_order_status(
    order_id: UUID,
    payload: OrderStatusUpdate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    del admin
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = payload.status
    db.commit()
    return {"ok": True}


# ============ SUPPORT MESSAGES ============
@router.get("/support/messages", response_model=List[dict])
def list_support_messages(db: Session = Depends(get_db), admin=Depends(require_admin)):
    del admin
    messages = (
        db.query(SupportMessage)
        .order_by(SupportMessage.created_at.desc())
        .all()
    )
    return [
        {
            "id": msg.id,
            "user": {
                "id": msg.user.id,
                "name": msg.user.name,
                "email": msg.user.email,
            },
            "subject": msg.subject,
            "message": msg.message,
            "response": msg.response,
            "status": msg.status,
            "created_at": msg.created_at,
        }
        for msg in messages
    ]


@router.patch("/support/messages/{message_id}")
def respond_support_message(
    message_id: UUID,
    payload: SupportMessageAdminUpdate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    del admin
    message = db.query(SupportMessage).filter(SupportMessage.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    message.status = payload.status
    if payload.response is not None:
        message.response = payload.response
    db.commit()
    return {"ok": True}


@router.post("/actions/send-sales-report", status_code=status.HTTP_202_ACCEPTED)
def send_sales_report(
    payload: SalesReportRequest,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    del admin
    email = payload.email or settings.REPORT_EMAIL
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Sales report email automation is not configured for the local Postgres deployment.",
    )


@router.get("/vendor-report", response_model=VendorReportOut)
def get_vendor_report(
    delivery_date: str = Query(..., description="Delivery date in YYYY-MM-DD format"),
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    """
    Get vendor order report aggregated by delivery date.
    
    Returns:
    - Total number of orders
    - Total weight in kg
    - Total items count
    - Product breakdown (product name + total qty)
    - All customer instructions/notes
    """
    del admin
    
    from datetime import datetime as dt
    
    # Parse delivery date
    try:
        target_date = dt.strptime(delivery_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Get all orders for the delivery date
    # Note: Orders table has delivery_slot field which contains date/time info
    # We'll filter orders where delivery_slot contains the date
    orders = (
        db.query(Order)
        .filter(Order.delivery_slot.contains(delivery_date))
        .options(selectinload(Order.items).selectinload(OrderItem.product))
        .options(selectinload(Order.user))
        .all()
    )
    
    if not orders:
        # Return empty report
        return VendorReportOut(
            delivery_date=target_date,
            total_orders=0,
            total_kg=0.0,
            total_items=0,
            products=[],
            instructions=[]
        )
    
    # Aggregate data
    total_orders = len(orders)
    total_kg = 0.0
    total_items = 0
    product_totals = {}  # {product_name: total_qty_kg}
    instructions = []
    
    for order in orders:
        for item in order.items:
            total_kg += item.qty_kg
            total_items += 1
            
            # Aggregate by product name
            product_name = item.product.name if item.product else "Unknown Product"
            if product_name in product_totals:
                product_totals[product_name] += item.qty_kg
            else:
                product_totals[product_name] = item.qty_kg
        
        # Collect instructions (delivery_slot acts as notes field for now)
        # Add any order-level notes
        if order.delivery_slot:
            instructions.append(
                VendorReportInstruction(
                    order_id=order.id,
                    customer_name=order.user.name if order.user else "Unknown",
                    notes=order.delivery_slot
                )
            )
    
    # Convert product_totals to list
    products = [
        VendorReportProductItem(product_name=name, total_qty_kg=round(qty, 3))
        for name, qty in sorted(product_totals.items(), key=lambda x: x[1], reverse=True)
    ]
    
    return VendorReportOut(
        delivery_date=target_date,
        total_orders=total_orders,
        total_kg=round(total_kg, 3),
        total_items=total_items,
        products=products,
        instructions=instructions
    )


# ============ CUT & CLEAN OPTIONS ============
@router.get("/cut-clean-options", response_model=List[CutCleanOptionOut])
def list_cut_clean_options(db: Session = Depends(get_db), admin=Depends(require_admin)):
    del admin
    options = db.query(CutCleanOption).order_by(CutCleanOption.sort_order, CutCleanOption.label).all()
    return options


@router.post("/cut-clean-options", response_model=CutCleanOptionOut, status_code=201)
def create_cut_clean_option(
    payload: CutCleanOptionCreate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    del admin
    option = CutCleanOption(
        label=payload.label,
        is_active=payload.is_active,
        sort_order=payload.sort_order
    )
    db.add(option)
    db.commit()
    db.refresh(option)
    return option


@router.patch("/cut-clean-options/{option_id}", response_model=CutCleanOptionOut)
def update_cut_clean_option(
    option_id: UUID,
    payload: CutCleanOptionUpdate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    del admin
    option = db.query(CutCleanOption).filter(CutCleanOption.id == option_id).first()
    if not option:
        raise HTTPException(status_code=404, detail="Cut & Clean option not found")
    
    if payload.label is not None:
        option.label = payload.label
    if payload.is_active is not None:
        option.is_active = payload.is_active
    if payload.sort_order is not None:
        option.sort_order = payload.sort_order
    
    db.commit()
    db.refresh(option)
    return option


@router.delete("/cut-clean-options/{option_id}", status_code=204)
def delete_cut_clean_option(
    option_id: UUID,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    del admin
    option = db.query(CutCleanOption).filter(CutCleanOption.id == option_id).first()
    if not option:
        raise HTTPException(status_code=404, detail="Cut & Clean option not found")
    
    db.delete(option)
    db.commit()
    return None
