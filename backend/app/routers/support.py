from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import SupportMessage
from ..schemas import SupportMessageCreate, SupportMessageOut

router = APIRouter(prefix="/support", tags=["support"])


@router.post("/messages", response_model=SupportMessageOut)
def create_message(
    payload: SupportMessageCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    message = SupportMessage(
        user_id=user.id,
        subject=payload.subject,
        message=payload.message,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


@router.get("/messages", response_model=List[SupportMessageOut])
def my_messages(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return (
        db.query(SupportMessage)
        .filter(SupportMessage.user_id == user.id)
        .order_by(SupportMessage.created_at.desc())
        .all()
    )


@router.get("/messages/{message_id}", response_model=SupportMessageOut)
def get_message(
    message_id: UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    message = (
        db.query(SupportMessage)
        .filter(SupportMessage.id == message_id, SupportMessage.user_id == user.id)
        .first()
    )
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    return message
