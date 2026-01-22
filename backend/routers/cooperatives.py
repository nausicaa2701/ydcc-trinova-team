"""Cooperative (HTX) management endpoints."""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.models import Cooperative, UserRole
from backend.database import cooperatives_db
from backend.auth import require_role, get_current_user

router = APIRouter(prefix="/coops", tags=["cooperatives"])


class CooperativeCreate(BaseModel):
    name: str
    province: str
    address: Optional[str] = None
    center_lat: float
    center_lon: float
    status: str = "active"
    config: dict = {}


class CooperativeUpdate(BaseModel):
    name: Optional[str] = None
    province: Optional[str] = None
    address: Optional[str] = None
    center_lat: Optional[float] = None
    center_lon: Optional[float] = None
    status: Optional[str] = None
    config: Optional[dict] = None


@router.get("", response_model=List[dict])
async def list_cooperatives(
    current_user = Depends(require_role([UserRole.SYSTEM_ADMIN]))
):
    """List all cooperatives (SYSTEM_ADMIN only)."""
    return [coop.dict() for coop in cooperatives_db.values()]


@router.post("", response_model=dict)
async def create_cooperative(
    coop: CooperativeCreate,
    current_user = Depends(require_role([UserRole.SYSTEM_ADMIN]))
):
    """Create new cooperative (SYSTEM_ADMIN only)."""
    import uuid
    from datetime import datetime
    
    coop_id = f"htx-{uuid.uuid4().hex[:8]}"
    new_coop = Cooperative(
        id=coop_id,
        name=coop.name,
        province=coop.province,
        address=coop.address,
        center_lat=coop.center_lat,
        center_lon=coop.center_lon,
        status=coop.status,
        config=coop.config
    )
    cooperatives_db[coop_id] = new_coop
    return new_coop.dict()


@router.get("/{coop_id}", response_model=dict)
async def get_cooperative(
    coop_id: str,
    current_user = Depends(get_current_user)
):
    """Get cooperative by ID."""
    if coop_id not in cooperatives_db:
        raise HTTPException(status_code=404, detail="Cooperative not found")
    
    # Allow access if user is system admin or coop admin of this coop
    if current_user.role == UserRole.SYSTEM_ADMIN:
        return cooperatives_db[coop_id].dict()
    if current_user.role == UserRole.COOP_ADMIN and current_user.coop_id == coop_id:
        return cooperatives_db[coop_id].dict()
    if current_user.role == UserRole.FARMER and current_user.coop_id == coop_id:
        return cooperatives_db[coop_id].dict()
    
    raise HTTPException(status_code=403, detail="Access denied")


@router.put("/{coop_id}", response_model=dict)
async def update_cooperative(
    coop_id: str,
    update: CooperativeUpdate,
    current_user = Depends(require_role([UserRole.SYSTEM_ADMIN]))
):
    """Update cooperative (SYSTEM_ADMIN only)."""
    if coop_id not in cooperatives_db:
        raise HTTPException(status_code=404, detail="Cooperative not found")
    
    coop = cooperatives_db[coop_id]
    update_data = update.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(coop, key, value)
    
    coop.updated_at = datetime.now()
    cooperatives_db[coop_id] = coop
    
    return coop.dict()


@router.delete("/{coop_id}")
async def delete_cooperative(
    coop_id: str,
    current_user = Depends(require_role([UserRole.SYSTEM_ADMIN]))
):
    """Delete cooperative (soft delete, SYSTEM_ADMIN only)."""
    if coop_id not in cooperatives_db:
        raise HTTPException(status_code=404, detail="Cooperative not found")
    
    coop = cooperatives_db[coop_id]
    coop.status = "inactive"
    coop.updated_at = datetime.now()
    cooperatives_db[coop_id] = coop
    
    return {"message": "Cooperative deactivated"}


@router.put("/{coop_id}/config", response_model=dict)
async def update_coop_config(
    coop_id: str,
    config: dict,
    current_user = Depends(require_role([UserRole.SYSTEM_ADMIN]))
):
    """Update cooperative JSON config (SYSTEM_ADMIN only)."""
    if coop_id not in cooperatives_db:
        raise HTTPException(status_code=404, detail="Cooperative not found")
    
    coop = cooperatives_db[coop_id]
    coop.config = config
    coop.updated_at = datetime.now()
    cooperatives_db[coop_id] = coop
    
    return {"message": "Config updated", "config": coop.config}

