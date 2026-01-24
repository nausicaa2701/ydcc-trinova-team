"""Authentication endpoints."""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
import sys
from pathlib import Path
import hashlib

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.auth import create_access_token, get_current_user
from backend.models import User
from backend.database_postgres import get_db
from backend.db_models import UserDB

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    phone: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


def hash_password(password: str) -> str:
    """Hash password using SHA256."""
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, password_hash: str) -> bool:
    """Verify password against hash."""
    return hash_password(password) == password_hash


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Login with phone and password."""
    # Find user by phone
    user = db.query(UserDB).filter(UserDB.phone == request.phone).first()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid phone or password")
    
    if not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid phone or password")
    
    # Convert DB model to Pydantic model for token creation
    pydantic_user = User(
        id=user.id,
        phone=user.phone,
        name=user.name,
        role=user.role,
        coop_id=user.coop_id,
        password_hash=user.password_hash
    )
    
    token = create_access_token(pydantic_user)
    
    return LoginResponse(
        access_token=token,
        user={
            "id": user.id,
            "phone": user.phone,
            "name": user.name,
            "role": user.role,
            "coop_id": user.coop_id
        }
    )


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change password for logged-in user."""
    # Get user from database
    db_user = db.query(UserDB).filter(UserDB.id == current_user.id).first()
    
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not verify_password(request.old_password, db_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect old password")
    
    # Update password
    db_user.password_hash = hash_password(request.new_password)
    db.commit()
    
    return {"message": "Password changed successfully"}


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user profile."""
    return {
        "id": current_user.id,
        "phone": current_user.phone,
        "name": current_user.name,
        "role": current_user.role,
        "coop_id": current_user.coop_id
    }

