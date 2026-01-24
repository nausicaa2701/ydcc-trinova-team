"""Authentication utilities and JWT handling."""

from datetime import datetime, timedelta
from typing import Optional
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from jose import jwt
except ImportError:
    try:
        import jwt
    except ImportError:
        raise ImportError("Please install python-jose: pip install python-jose[cryptography]")

from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from backend.models import User, UserRole
from backend.database_postgres import get_db
from backend.db_models import UserDB

# JWT secret (use environment variable in production)
SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
security = HTTPBearer()


def create_access_token(user: User) -> str:
    """Create JWT access token."""
    payload = {
        "sub": user.id,
        "phone": user.phone,
        "role": user.role,
        "coop_id": user.coop_id,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and verify JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user from JWT token."""
    token = credentials.credentials
    payload = decode_token(token)
    user_id = payload.get("sub")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    
    # Query user from PostgreSQL database
    user_db = db.query(UserDB).filter(UserDB.id == user_id).first()
    
    if not user_db:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Convert UserDB to User model for compatibility
    return User(
        id=user_db.id,
        phone=user_db.phone,
        name=user_db.name,
        role=UserRole(user_db.role),
        coop_id=user_db.coop_id,
        password_hash=user_db.password_hash,
        lat=user_db.lat,
        lon=user_db.lon,
        station_id=user_db.station_id,
        crop_type=user_db.crop_type,
        crop_stage=user_db.crop_stage,
        threshold_salinity=user_db.threshold_salinity,
        storage_capacity_m3=user_db.storage_capacity_m3
    )


def require_role(allowed_roles: list[UserRole]):
    """Decorator to require specific role(s)."""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required roles: {[r.value for r in allowed_roles]}"
            )
        return current_user
    return role_checker


def require_coop_access(coop_id: str):
    """Require user to be admin of specific coop or system admin."""
    def coop_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role == UserRole.SYSTEM_ADMIN:
            return current_user
        if current_user.role == UserRole.COOP_ADMIN and current_user.coop_id == coop_id:
            return current_user
        raise HTTPException(status_code=403, detail="Access denied to this cooperative")
    return coop_checker

