from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Category, CutCleanOption, Product
from ..schemas import CutCleanOptionOut, ProductCreate, ProductOut

router = APIRouter(prefix="/products", tags=["products"])


@router.get("/", response_model=List[ProductOut])
def list_products(db: Session = Depends(get_db)):
    return db.query(Product).filter(Product.is_active.is_(True)).all()


@router.get("/{slug}", response_model=ProductOut)
def get_product(slug: str, db: Session = Depends(get_db)):
    prod = (
        db.query(Product)
        .filter(Product.slug == slug, Product.is_active.is_(True))
        .first()
    )
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    return prod


@router.post("/", response_model=ProductOut)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    if not db.query(Category).filter(Category.id == payload.category_id).first():
        raise HTTPException(status_code=400, detail="Invalid category")

    prod = Product(**payload.model_dump())
    db.add(prod)
    db.commit()
    db.refresh(prod)
    return prod


@router.get("/cut-clean-options", response_model=List[CutCleanOptionOut])
def get_active_cut_clean_options(db: Session = Depends(get_db)):
    """Get all active cut & clean options for users."""
    options = (
        db.query(CutCleanOption)
        .filter(CutCleanOption.is_active.is_(True))
        .order_by(CutCleanOption.sort_order, CutCleanOption.label)
        .all()
    )
    return options
