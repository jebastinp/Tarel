from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..deps import get_current_user
from ..models import Order, OrderItem, OrderStatusEnum, Product
from ..schemas import OrderCreate, OrderOut

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("/my", response_model=List[OrderOut])
def my_orders(db: Session = Depends(get_db), user=Depends(get_current_user)):
    orders = (
        db.query(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.product))
        .filter(Order.user_id == user.id)
        .order_by(Order.created_at.desc())
        .all()
    )
    return orders


@router.post("/", response_model=OrderOut)
def create_order(
    payload: OrderCreate, db: Session = Depends(get_db), user=Depends(get_current_user)
):
    items: list[tuple[Product, float]] = []
    total = 0.0
    for it in payload.items:
        prod = (
            db.query(Product)
            .filter(Product.id == it.product_id, Product.is_active.is_(True))
            .first()
        )
        if not prod:
            raise HTTPException(status_code=400, detail=f"Invalid product {it.product_id}")
        if prod.stock_kg < it.qty_kg:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {prod.name}")
        total += it.qty_kg * prod.price_per_kg
        items.append((prod, it.qty_kg))

    order = Order(
        user_id=user.id,
        total_amount=total,
        delivery_slot=payload.delivery_slot,
        address_line=payload.address_line,
        postcode=payload.postcode,
    )
    db.add(order)
    db.flush()

    for prod, qty in items:
        db.add(
            OrderItem(
                order_id=order.id,
                product_id=prod.id,
                qty_kg=qty,
                price_per_kg=prod.price_per_kg,
            )
        )
        prod.stock_kg -= qty
    db.commit()

    order = (
        db.query(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.product))
        .filter(Order.id == order.id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=500, detail="Order was not persisted")
    return order


@router.post("/{order_id}/cancel", response_model=OrderOut)
def cancel_order(order_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    order = (
        db.query(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.product))
        .filter(Order.id == order_id, Order.user_id == user.id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status in {OrderStatusEnum.delivered, OrderStatusEnum.out_for_delivery}:
        raise HTTPException(status_code=400, detail="Orders already dispatched cannot be cancelled")

    if order.status != OrderStatusEnum.cancelled:
        for item in order.items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if product:
                product.stock_kg += item.qty_kg
        order.status = OrderStatusEnum.cancelled
        db.add(order)
        db.commit()

        order = (
            db.query(Order)
            .options(selectinload(Order.items).selectinload(OrderItem.product))
            .filter(Order.id == order.id)
            .first()
        )

    return order
