import httpx
from typing import Optional
from urllib.parse import quote

from fastapi import APIRouter, HTTPException, Query

from ..config import settings

router = APIRouter(tags=["getaddress"])

_AUTOCOMPLETE_PATH = "/autocomplete"
_GET_PATH = "/get"
_TIMEOUT_SECONDS = 5.0


def _require_api_key() -> str:
    key = settings.GETADDRESS_API_KEY
    if not key:
        raise HTTPException(status_code=500, detail="Address lookup service is not configured.")
    return key


async def _perform_request(
    path: str,
    *,
    params: dict[str, str],
    json_body: Optional[dict] = None,
    method: str = "GET",
) -> dict:
    url = f"{settings.GETADDRESS_BASE_URL.rstrip('/')}{path}"
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT_SECONDS) as client:
            response = await client.request(method, url, params=params, json=json_body)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Address service is unavailable.") from exc

    if response.status_code >= 400:
        if response.headers.get("content-type", "").startswith("application/json"):
            try:
                detail = response.json()
            except ValueError:
                detail = {"message": "Address service returned an invalid response."}
        else:
            detail = {"message": response.text or "Address lookup failed."}
        raise HTTPException(status_code=response.status_code, detail=detail)

    try:
        return response.json()
    except ValueError as exc:
        raise HTTPException(status_code=502, detail="Address service returned malformed data.") from exc


@router.get("/autocomplete")
async def autocomplete(
    term: str = Query(..., min_length=2, max_length=200, strip_whitespace=True),
    top: Optional[int] = Query(None, ge=1, le=20),
    include_all: Optional[bool] = Query(None, alias="all"),
    show_postcode: Optional[bool] = Query(None, alias="show_postcode"),
    template: Optional[str] = Query(None, max_length=200),
    filter_county: Optional[str] = Query(None, alias="filter_county", strip_whitespace=True),
    filter_country: Optional[str] = Query(None, alias="filter_country", strip_whitespace=True),
    filter_locality: Optional[str] = Query(None, alias="filter_locality", strip_whitespace=True),
    filter_district: Optional[str] = Query(None, alias="filter_district", strip_whitespace=True),
    filter_town_or_city: Optional[str] = Query(None, alias="filter_town_or_city", strip_whitespace=True),
    filter_postcode: Optional[str] = Query(None, alias="filter_postcode", strip_whitespace=True),
    filter_residential: Optional[bool] = Query(None, alias="filter_residential"),
    radius_km: Optional[float] = Query(None, ge=0, alias="radius_km"),
    radius_latitude: Optional[float] = Query(None, alias="radius_latitude"),
    radius_longitude: Optional[float] = Query(None, alias="radius_longitude"),
    location_latitude: Optional[float] = Query(None, alias="location_latitude"),
    location_longitude: Optional[float] = Query(None, alias="location_longitude"),
):
    api_key = _require_api_key()
    encoded_term = quote(term, safe="")
    params: dict[str, str] = {"api-key": api_key}

    if top is not None:
        params["top"] = str(top)
    if include_all is not None:
        params["all"] = "true" if include_all else "false"
    if show_postcode is not None:
        params["show-postcode"] = "true" if show_postcode else "false"
    if template:
        params["template"] = template

    filter_payload: dict[str, object] = {}

    if filter_county:
        filter_payload["county"] = filter_county
    if filter_country:
        filter_payload["country"] = filter_country
    if filter_locality:
        filter_payload["locality"] = filter_locality
    if filter_district:
        filter_payload["district"] = filter_district
    if filter_town_or_city:
        filter_payload["town_or_city"] = filter_town_or_city
    if filter_postcode:
        filter_payload["postcode"] = filter_postcode
    if filter_residential is not None:
        filter_payload["residential"] = filter_residential

    if radius_km is not None or radius_latitude is not None or radius_longitude is not None:
        missing_radius_fields = [
            name
            for name, value in {
                "radius_km": radius_km,
                "radius_latitude": radius_latitude,
                "radius_longitude": radius_longitude,
            }.items()
            if value is None
        ]
        if missing_radius_fields:
            raise HTTPException(
                status_code=400,
                detail=f"radius_km, radius_latitude, and radius_longitude must all be provided together. Missing: {', '.join(missing_radius_fields)}",
            )
        filter_payload["radius"] = {
            "km": radius_km,
            "latitude": radius_latitude,
            "longitude": radius_longitude,
        }

    location_payload: Optional[dict[str, float]] = None
    if location_latitude is not None or location_longitude is not None:
        if location_latitude is None or location_longitude is None:
            raise HTTPException(
                status_code=400,
                detail="Both location_latitude and location_longitude are required when using location biasing.",
            )
        location_payload = {
            "latitude": location_latitude,
            "longitude": location_longitude,
        }

    body: Optional[dict[str, object]] = None
    if filter_payload or location_payload:
        body = {}
        if filter_payload:
            body["filter"] = filter_payload
        if location_payload:
            body["location"] = location_payload

    method = "POST" if body else "GET"

    payload = await _perform_request(
        f"{_AUTOCOMPLETE_PATH}/{encoded_term}",
        params=params,
        json_body=body,
        method=method,
    )
    return payload


@router.get("/getaddress")
async def get_address(id: str = Query(..., min_length=3, max_length=200, strip_whitespace=True)):
    api_key = _require_api_key()
    encoded_id = quote(id, safe="")
    payload = await _perform_request(
        f"{_GET_PATH}/{encoded_id}",
        params={"api-key": api_key},
    )
    return payload
