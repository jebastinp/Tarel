from __future__ import annotations

import json
from datetime import date, datetime
from typing import Optional, Tuple

from sqlalchemy.orm import Session

from .models import SiteSetting

NEXT_DELIVERY_KEY = "next_delivery_settings"
LEGACY_NEXT_DELIVERY_KEY = "next_delivery_date"


def _load_setting(db: Session) -> Optional[SiteSetting]:
    setting = (
        db.query(SiteSetting)
        .filter(SiteSetting.key == NEXT_DELIVERY_KEY)
        .first()
    )
    if setting:
        return setting
    return (
        db.query(SiteSetting)
        .filter(SiteSetting.key == LEGACY_NEXT_DELIVERY_KEY)
        .first()
    )


def _parse_setting_value(raw_value: Optional[str]) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    if not raw_value:
        return None, None, None

    try:
        payload = json.loads(raw_value)
        if not isinstance(payload, dict):
            raise ValueError("Invalid payload shape")
        scheduled_for = payload.get("scheduled_for")
        cutoff_at = payload.get("cutoff_at")
        window_label = payload.get("window_label")
        if isinstance(window_label, str):
            window_label = window_label.strip() or None
        else:
            window_label = None if window_label is None else (str(window_label).strip() or None)
        return scheduled_for, cutoff_at, window_label
    except (ValueError, json.JSONDecodeError):
        # Legacy plain date storage
        try:
            scheduled_for = date.fromisoformat(raw_value)
        except ValueError:
            return None, None, None
        return scheduled_for.isoformat(), None, None


def get_next_delivery(db: Session) -> dict:
    setting = _load_setting(db)
    scheduled_for_raw, cutoff_at_raw, window_label = _parse_setting_value(setting.value if setting else None)

    scheduled_for = None
    if scheduled_for_raw:
        try:
            scheduled_for = date.fromisoformat(scheduled_for_raw)
        except ValueError:
            scheduled_for = None

    cutoff_at = None
    if cutoff_at_raw:
        try:
            cutoff_at = datetime.fromisoformat(cutoff_at_raw)
        except ValueError:
            cutoff_at = None

    return {
        "scheduled_for": scheduled_for,
        "cutoff_at": cutoff_at,
        "window_label": window_label,
        "updated_at": setting.updated_at if setting else None,
    }


def set_next_delivery(
    db: Session,
    scheduled_for: Optional[date],
    cutoff_at: Optional[datetime],
    window_label: Optional[str],
) -> dict:
    setting = _load_setting(db)
    now = datetime.utcnow()

    normalized_label = window_label.strip() if window_label else None
    payload = {
        "scheduled_for": scheduled_for.isoformat() if scheduled_for else None,
        "cutoff_at": cutoff_at.isoformat() if cutoff_at else None,
        "window_label": normalized_label,
    }

    value = json.dumps(payload)

    if setting:
        setting.key = NEXT_DELIVERY_KEY
        setting.value = value
        setting.updated_at = now
    else:
        setting = SiteSetting(
            key=NEXT_DELIVERY_KEY,
            value=value,
            created_at=now,
            updated_at=now,
        )
        db.add(setting)

    db.commit()
    db.refresh(setting)

    return {
        "scheduled_for": scheduled_for,
        "cutoff_at": cutoff_at,
        "window_label": normalized_label,
        "updated_at": setting.updated_at,
    }
