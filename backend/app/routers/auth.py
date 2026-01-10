from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ..auth import create_access_token, hash_password, verify_password
from ..database import get_db
from ..deps import get_current_user
from ..models import User
from ..schemas import TokenOut, UserCreate, UserOut, UserUpdate
from ..utils import generate_user_code

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    exists = db.query(User).filter(User.email == payload.email).first()
    if exists:
        raise HTTPException(status_code=400, detail="Email already registered")

    try:
        user_code = generate_user_code(db, payload.postcode)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        phone=payload.phone,
        address_line1=payload.address_line1,
        locality=payload.locality.strip() if payload.locality else None,
        city=payload.city,
        postcode=payload.postcode,
        user_code=user_code,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenOut)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenOut(access_token=token, user=user)


@router.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.patch("/me", response_model=UserOut)
def update_current_user(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    updated = False

    if payload.name is not None and payload.name != current_user.name:
        current_user.name = payload.name
        updated = True

    if payload.password:
        current_user.password_hash = hash_password(payload.password)
        updated = True

    if updated:
        db.add(current_user)
        db.commit()
        db.refresh(current_user)

    return current_user
