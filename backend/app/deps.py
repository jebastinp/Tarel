from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import RoleEnum, User

reuse_oauth = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def _credentials_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )


async def get_current_user(
    token: str = Depends(reuse_oauth), db: Session = Depends(get_db)
) -> User:
    cred_exc = _credentials_exception()
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALG])
        sub = payload.get("sub")
        if sub is None:
            raise cred_exc
        user_id = UUID(str(sub))
    except (JWTError, ValueError, TypeError):
        raise cred_exc from None

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise cred_exc
    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Admins only")
    return user
