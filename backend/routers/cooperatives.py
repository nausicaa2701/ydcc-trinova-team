"""Cooperative (HTX) management endpoints."""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
import sys
from pathlib import Path
import uuid

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.models import UserRole
from backend.database_postgres import get_db
from backend.db_models import CooperativeDB
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


class CooperativeResponse(BaseModel):
    id: str
    name: str
    province: str
    address: Optional[str]
    center_lat: float
    center_lon: float
    status: str
    config: dict


@router.get("", response_model=List[CooperativeResponse])
async def list_cooperatives(
    current_user = Depends(require_role([UserRole.SYSTEM_ADMIN])),
    db: Session = Depends(get_db)
):
    """List all cooperatives (SYSTEM_ADMIN only)."""
    cooperatives = db.query(CooperativeDB).all()
    return cooperatives


@router.post("", response_model=CooperativeResponse)
async def create_cooperative(
    coop: CooperativeCreate,
    current_user = Depends(require_role([UserRole.SYSTEM_ADMIN])),
    db: Session = Depends(get_db)
):
    """Create new cooperative (SYSTEM_ADMIN only)."""
    coop_id = f"htx-{uuid.uuid4().hex[:8]}"
    new_coop = CooperativeDB(
        id=coop_id,
        name=coop.name,
        province=coop.province,
        address=coop.address,
        center_lat=coop.center_lat,
        center_lon=coop.center_lon,
        status=coop.status,
        config=coop.config
    )
    db.add(new_coop)
    db.commit()
    db.refresh(new_coop)
    return new_coop


@router.get("/{coop_id}", response_model=CooperativeResponse)
async def get_cooperative(
    coop_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get cooperative by ID."""
    coop = db.query(CooperativeDB).filter(CooperativeDB.id == coop_id).first()
    
    if not coop:
        raise HTTPException(status_code=404, detail="Cooperative not found")
    
    # Allow access if user is system admin or coop admin/farmer of this coop
    if current_user.role == UserRole.SYSTEM_ADMIN:
        return coop
    if current_user.role in [UserRole.COOP_ADMIN, UserRole.FARMER] and current_user.coop_id == coop_id:
        return coop
    
    raise HTTPException(status_code=403, detail="Access denied")


@router.put("/{coop_id}", response_model=CooperativeResponse)
async def update_cooperative(
    coop_id: str,
    update: CooperativeUpdate,
    current_user = Depends(require_role([UserRole.SYSTEM_ADMIN])),
    db: Session = Depends(get_db)
):
    """Update cooperative (SYSTEM_ADMIN only)."""
    coop = db.query(CooperativeDB).filter(CooperativeDB.id == coop_id).first()
    
    if not coop:
        raise HTTPException(status_code=404, detail="Cooperative not found")
    
    update_data = update.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(coop, key, value)
    
    db.commit()
    db.refresh(coop)
    
    return coop


@router.delete("/{coop_id}")
async def delete_cooperative(
    coop_id: str,
    current_user = Depends(require_role([UserRole.SYSTEM_ADMIN])),
    db: Session = Depends(get_db)
):
    """Delete cooperative (soft delete, SYSTEM_ADMIN only)."""
    coop = db.query(CooperativeDB).filter(CooperativeDB.id == coop_id).first()
    
    if not coop:
        raise HTTPException(status_code=404, detail="Cooperative not found")
    
    coop.status = "inactive"
    db.commit()
    
    return {"message": "Cooperative deactivated"}


@router.put("/{coop_id}/config", response_model=dict)
async def update_coop_config(
    coop_id: str,
    config: dict,
    current_user = Depends(require_role([UserRole.SYSTEM_ADMIN])),
    db: Session = Depends(get_db)
):
    """Update cooperative JSON config (SYSTEM_ADMIN only)."""
    coop = db.query(CooperativeDB).filter(CooperativeDB.id == coop_id).first()
    
    if not coop:
        raise HTTPException(status_code=404, detail="Cooperative not found")
    
    coop.config = config
    db.commit()
    
    return {"message": "Config updated", "config": coop.config}


# Debug endpoint to check all database records
@router.get("/debug/all-records", tags=["debug"])
async def debug_all_records(db: Session = Depends(get_db)):
    """View all database records (for debugging)."""
    from backend.db_models import UserDB, AlertConfigDB, StationDB
    
    return {
        "cooperatives": [
            {
                "id": c.id,
                "name": c.name,
                "province": c.province,
                "center_lat": c.center_lat,
                "center_lon": c.center_lon,
                "status": c.status
            }
            for c in db.query(CooperativeDB).all()
        ],
        "users": [
            {
                "id": u.id,
                "phone": u.phone,
                "name": u.name,
                "role": u.role,
                "coop_id": u.coop_id,
                "location": {"lat": u.lat, "lon": u.lon} if u.lat and u.lon else None,
                "crop_type": u.crop_type,
                "crop_stage": u.crop_stage
            }
            for u in db.query(UserDB).all()
        ],
        "alert_configs": [
            {
                "id": a.id,
                "coop_id": a.coop_id,
                "threshold_salinity": a.threshold_salinity,
                "enabled": a.enabled
            }
            for a in db.query(AlertConfigDB).all()
        ],
        "stations": [
            {
                "id": s.id,
                "station_name": s.station_name,
                "lat": s.lat,
                "lon": s.lon,
                "province": s.province
            }
            for s in db.query(StationDB).all()
        ]
    }