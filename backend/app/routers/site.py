from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import NextDeliveryResponse
from ..site_settings import get_next_delivery

router = APIRouter(prefix="/site", tags=["site"])


@router.get("/next-delivery", response_model=NextDeliveryResponse)
def public_next_delivery(db: Session = Depends(get_db)):
    return get_next_delivery(db)
