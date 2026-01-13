from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from ..schemas import NextDeliveryResponse
from ..site_settings import get_next_delivery
from . import getaddress

router = APIRouter(prefix="/site", tags=["site"])


@router.get("/next-delivery", response_model=NextDeliveryResponse)
def public_next_delivery(db: Session = Depends(get_db)):
    return get_next_delivery(db)


# Address lookup endpoints
@router.get("/address/autocomplete")
async def address_autocomplete(
    term: str = Query(..., min_length=2, max_length=200, strip_whitespace=True),
    top: Optional[int] = Query(None, ge=1, le=20),
):
    """Public endpoint for address autocomplete"""
    return await getaddress.autocomplete(term=term, top=top)


@router.get("/address/getaddress")
async def address_get(
    id: str = Query(..., min_length=1, max_length=200, strip_whitespace=True),
):
    """Public endpoint for getting full address details"""
    return await getaddress.get_address(id=id)
