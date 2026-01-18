"""Farmer management endpoints for COOP_ADMIN."""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import uuid
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.models import User, UserRole
from backend.database import users_db, hash_password
from backend.auth import require_role, require_coop_access, get_current_user

router = APIRouter(prefix="/coops/{coop_id}/farmers", tags=["farmers"])


class FarmerCreate(BaseModel):
    name: str
    phone: str
    metadata: dict = {}


class FarmerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    metadata: Optional[dict] = None


@router.get("", response_model=List[dict])
async def list_farmers(
    coop_id: str,
    current_user: User = Depends(get_current_user)
):
    """List farmers in a cooperative."""
    # Check access
    if current_user.role != UserRole.SYSTEM_ADMIN:
        if current_user.role != UserRole.COOP_ADMIN or current_user.coop_id != coop_id:
            raise HTTPException(status_code=403, detail="Access denied to this cooperative")
    
    farmers = [
        user.dict(exclude={"password_hash"})
        for user in users_db.values()
        if user.role == UserRole.FARMER and user.coop_id == coop_id
    ]
    return farmers


@router.post("", response_model=dict)
async def create_farmer(
    coop_id: str,
    farmer: FarmerCreate,
    current_user: User = Depends(get_current_user)
):
    """Create new farmer account (COOP_ADMIN only)."""
    # Check access
    if current_user.role != UserRole.SYSTEM_ADMIN:
        if current_user.role != UserRole.COOP_ADMIN or current_user.coop_id != coop_id:
            raise HTTPException(status_code=403, detail="Access denied to this cooperative")
    
    # Check if phone already exists
    for user in users_db.values():
        if user.phone == farmer.phone:
            raise HTTPException(status_code=400, detail="Phone number already registered")
    
    # Generate temporary password (first 6 digits of phone)
    temp_password = farmer.phone[-6:]
    
    farmer_id = f"farmer-{uuid.uuid4().hex[:8]}"
    new_farmer = User(
        id=farmer_id,
        phone=farmer.phone,
        name=farmer.name,
        role=UserRole.FARMER,
        coop_id=coop_id,
        password_hash=hash_password(temp_password)
    )
    users_db[farmer_id] = new_farmer
    
    return {
        **new_farmer.dict(exclude={"password_hash"}),
        "temp_password": temp_password  # Return temp password for admin to share
    }


@router.put("/{farmer_id}", response_model=dict)
async def update_farmer(
    coop_id: str,
    farmer_id: str,
    update: FarmerUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update farmer info (COOP_ADMIN only)."""
    # Check access
    if current_user.role != UserRole.SYSTEM_ADMIN:
        if current_user.role != UserRole.COOP_ADMIN or current_user.coop_id != coop_id:
            raise HTTPException(status_code=403, detail="Access denied to this cooperative")
    
    if farmer_id not in users_db:
        raise HTTPException(status_code=404, detail="Farmer not found")
    
    farmer = users_db[farmer_id]
    if farmer.coop_id != coop_id:
        raise HTTPException(status_code=403, detail="Farmer not in this cooperative")
    
    update_data = update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(farmer, key, value)
    
    farmer.updated_at = datetime.now()
    users_db[farmer_id] = farmer
    
    return farmer.dict(exclude={"password_hash"})


@router.delete("/{farmer_id}")
async def delete_farmer(
    coop_id: str,
    farmer_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete/deactivate farmer (COOP_ADMIN only)."""
    # Check access
    if current_user.role != UserRole.SYSTEM_ADMIN:
        if current_user.role != UserRole.COOP_ADMIN or current_user.coop_id != coop_id:
            raise HTTPException(status_code=403, detail="Access denied to this cooperative")
    
    if farmer_id not in users_db:
        raise HTTPException(status_code=404, detail="Farmer not found")
    
    farmer = users_db[farmer_id]
    if farmer.coop_id != coop_id:
        raise HTTPException(status_code=403, detail="Farmer not in this cooperative")
    
    # Soft delete: remove from active users (in production, add is_active flag)
    del users_db[farmer_id]
    
    return {"message": "Farmer account deleted"}

