from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from urllib.parse import quote
import httpx

from ..database import get_db
from ..schemas import NextDeliveryResponse
from ..site_settings import get_next_delivery
from ..config import settings

router = APIRouter(prefix="/site", tags=["site"])


@router.get("/next-delivery", response_model=NextDeliveryResponse)
def public_next_delivery(db: Session = Depends(get_db)):
    return get_next_delivery(db)


# Address lookup endpoints
@router.get("/address/autocomplete")
async def address_autocomplete(
    term: str = Query(..., min_length=2, max_length=200),
    top: Optional[int] = Query(None, ge=1, le=20),
):
    """Public endpoint for address autocomplete"""
    api_key = settings.GETADDRESS_API_KEY
    if not api_key:
        raise HTTPException(status_code=500, detail="Address lookup service is not configured.")
    
    encoded_term = quote(term, safe="")
    params = {"api-key": api_key}
    if top is not None:
        params["top"] = str(top)
    
    url = f"{settings.GETADDRESS_BASE_URL.rstrip('/')}/autocomplete/{encoded_term}"
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url, params=params)
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Address service is unavailable.")
    
    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail="Address lookup failed.")
    
    try:
        return response.json()
    except ValueError:
        raise HTTPException(status_code=502, detail="Address service returned malformed data.")


@router.get("/address/getaddress")
async def address_get(
    id: str = Query(..., min_length=1, max_length=200),
):
    """Public endpoint for getting full address details"""
    api_key = settings.GETADDRESS_API_KEY
    if not api_key:
        raise HTTPException(status_code=500, detail="Address lookup service is not configured.")
    
    encoded_id = quote(id, safe="")
    params = {"api-key": api_key}
    
    url = f"{settings.GETADDRESS_BASE_URL.rstrip('/')}/get/{encoded_id}"
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url, params=params)
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Address service is unavailable.")
    
    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail="Address lookup failed.")
    
    try:
        return response.json()
    except ValueError:
        raise HTTPException(status_code=502, detail="Address service returned malformed data.")
