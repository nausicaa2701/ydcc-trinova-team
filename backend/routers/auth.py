"""Authentication endpoints."""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.auth import create_access_token, get_current_user
from backend.models import User
from backend.database import users_db, verify_password, hash_password

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


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Login with phone and password."""
    # Find user by phone
    user = None
    for u in users_db.values():
        if u.phone == request.phone:
            user = u
            break
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid phone or password")
    
    if not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid phone or password")
    
    token = create_access_token(user)
    
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
    current_user: User = Depends(get_current_user)
):
    """Change password for logged-in user."""
    if not verify_password(request.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect old password")
    
    # Update password
    current_user.password_hash = hash_password(request.new_password)
    users_db[current_user.id] = current_user
    
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

