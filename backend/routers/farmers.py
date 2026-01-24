"""Farmer management endpoints for COOP_ADMIN."""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
import uuid
import sys
from pathlib import Path
import hashlib
import pandas as pd

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.models import User, UserRole
from backend.database_postgres import get_db
from backend.db_models import UserDB, CooperativeDB, StationDB
from backend.auth import require_role, get_current_user
from backend.utils.geo_utils import find_nearest_stations, haversine_distance, get_station_location

router = APIRouter(prefix="/coops/{coop_id}/farmers", tags=["farmers"])


def hash_password(password: str) -> str:
    """Hash password using SHA256."""
    return hashlib.sha256(password.encode()).hexdigest()


class FarmerCreate(BaseModel):
    name: str
    phone: str
    lat: Optional[float] = None  # Farm location
    lon: Optional[float] = None
    station_id: Optional[str] = None  # Primary monitoring station
    crop_type: Optional[str] = None  # e.g., "rice", "shrimp", "vegetables"
    crop_stage: Optional[str] = None  # e.g., "seedling", "tillering", "harvest"
    threshold_salinity: Optional[float] = None  # Override coop default if needed
    storage_capacity_m3: Optional[float] = None  # Water storage capacity


class FarmerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    station_id: Optional[str] = None
    crop_type: Optional[str] = None
    crop_stage: Optional[str] = None
    threshold_salinity: Optional[float] = None
    storage_capacity_m3: Optional[float] = None


class FarmerResponse(BaseModel):
    id: str
    phone: str
    name: str
    role: str
    coop_id: Optional[str]
    lat: Optional[float]
    lon: Optional[float]
    station_id: Optional[str]
    crop_type: Optional[str]
    crop_stage: Optional[str]
    threshold_salinity: Optional[float]
    storage_capacity_m3: Optional[float]
    
    class Config:
        from_attributes = True
    
    @classmethod
    def from_orm(cls, farmer: "UserDB"):
        """Convert UserDB to FarmerResponse, resolving station_id to user-friendly format."""
        data = {
            "id": farmer.id,
            "phone": farmer.phone,
            "name": farmer.name,
            "role": farmer.role,
            "coop_id": farmer.coop_id,
            "lat": farmer.lat,
            "lon": farmer.lon,
            "station_id": farmer.station.station_id if farmer.station else None,  # Use the station's station_id field
            "crop_type": farmer.crop_type,
            "crop_stage": farmer.crop_stage,
            "threshold_salinity": farmer.threshold_salinity,
            "storage_capacity_m3": farmer.storage_capacity_m3,
        }
        return cls(**data)


@router.get("", response_model=List[FarmerResponse])
async def list_farmers(
    coop_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List farmers in a cooperative."""
    # Check access
    if current_user.role != UserRole.SYSTEM_ADMIN:
        if current_user.role != UserRole.COOP_ADMIN or current_user.coop_id != coop_id:
            raise HTTPException(status_code=403, detail="Access denied to this cooperative")
    
    farmers = db.query(UserDB).filter(
        UserDB.role == "FARMER",
        UserDB.coop_id == coop_id
    ).all()
    
    return [FarmerResponse.from_orm(farmer) for farmer in farmers]


@router.post("", response_model=dict)
async def create_farmer(
    coop_id: str,
    farmer: FarmerCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new farmer account (COOP_ADMIN only)."""
    # Check access
    if current_user.role != UserRole.SYSTEM_ADMIN:
        if current_user.role != UserRole.COOP_ADMIN or current_user.coop_id != coop_id:
            raise HTTPException(status_code=403, detail="Access denied to this cooperative")
    
    # Check if phone already exists
    existing_user = db.query(UserDB).filter(UserDB.phone == farmer.phone).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    # Check if cooperative exists
    coop = db.query(CooperativeDB).filter(CooperativeDB.id == coop_id).first()
    if not coop:
        raise HTTPException(status_code=404, detail="Cooperative not found")
    
    # Generate temporary password (last 6 digits of phone)
    temp_password = farmer.phone[-6:]
    
    farmer_id = f"farmer-{uuid.uuid4().hex[:8]}"
    
    # Validate and resolve station_id if provided
    station_pk_id = None
    if farmer.station_id:
        station = db.query(StationDB).filter(StationDB.station_id == farmer.station_id).first()
        if not station:
            raise HTTPException(status_code=400, detail=f"Station with ID '{farmer.station_id}' not found")
        station_pk_id = station.id
    
    new_farmer = UserDB(
        id=farmer_id,
        phone=farmer.phone,
        name=farmer.name,
        role="FARMER",
        coop_id=coop_id,
        password_hash=hash_password(temp_password),
        lat=farmer.lat,
        lon=farmer.lon,
        station_id=station_pk_id,
        crop_type=farmer.crop_type,
        crop_stage=farmer.crop_stage,
        threshold_salinity=farmer.threshold_salinity,
        storage_capacity_m3=farmer.storage_capacity_m3
    )
    
    db.add(new_farmer)
    db.commit()
    db.refresh(new_farmer)
    
    return {
        "id": new_farmer.id,
        "phone": new_farmer.phone,
        "name": new_farmer.name,
        "role": new_farmer.role,
        "coop_id": new_farmer.coop_id,
        "temp_password": temp_password  # Return temp password for admin to share
    }


@router.put("/{farmer_id}", response_model=FarmerResponse)
async def update_farmer(
    coop_id: str,
    farmer_id: str,
    update: FarmerUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update farmer info (COOP_ADMIN only)."""
    # Check access
    if current_user.role != UserRole.SYSTEM_ADMIN:
        if current_user.role != UserRole.COOP_ADMIN or current_user.coop_id != coop_id:
            raise HTTPException(status_code=403, detail="Access denied to this cooperative")
    
    farmer = db.query(UserDB).filter(UserDB.id == farmer_id).first()
    
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    
    if farmer.coop_id != coop_id:
        raise HTTPException(status_code=403, detail="Farmer not in this cooperative")
    
    # Validate station_id if provided
    update_data = update.dict(exclude_unset=True)
    
    if "station_id" in update_data and update_data["station_id"] is not None:
        # Check if station exists by station_id (the string identifier like "HCM02")
        station = db.query(StationDB).filter(StationDB.station_id == update_data["station_id"]).first()
        if not station:
            raise HTTPException(status_code=400, detail=f"Station with ID '{update_data['station_id']}' not found")
        # Use the station's primary key (id) for the foreign key
        update_data["station_id"] = station.id
    
    try:
        for key, value in update_data.items():
            setattr(farmer, key, value)
        
        db.commit()
        db.refresh(farmer)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update farmer: {str(e)}")
    
    return FarmerResponse.from_orm(farmer)


@router.delete("/{farmer_id}")
async def delete_farmer(
    coop_id: str,
    farmer_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete/deactivate farmer (COOP_ADMIN only)."""
    # Check access
    if current_user.role != UserRole.SYSTEM_ADMIN:
        if current_user.role != UserRole.COOP_ADMIN or current_user.coop_id != coop_id:
            raise HTTPException(status_code=403, detail="Access denied to this cooperative")
    
    farmer = db.query(UserDB).filter(UserDB.id == farmer_id).first()
    
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    
    if farmer.coop_id != coop_id:
        raise HTTPException(status_code=403, detail="Farmer not in this cooperative")
    
    db.delete(farmer)
    db.commit()
    
    return {"message": "Farmer account deleted"}


@router.get("/{farmer_id}/suggest-stations")
async def suggest_stations_for_farmer(
    coop_id: str,
    farmer_id: str,
    top_n: int = Query(default=3, ge=1, le=10),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Suggest nearest monitoring stations for a farmer based on location.
    
    If farmer has no location, use cooperative center location.
    """
    # Check access
    if current_user.role != UserRole.SYSTEM_ADMIN:
        if current_user.role != UserRole.COOP_ADMIN or current_user.coop_id != coop_id:
            if current_user.role != UserRole.FARMER or current_user.id != farmer_id:
                raise HTTPException(status_code=403, detail="Access denied")
    
    farmer = db.query(UserDB).filter(UserDB.id == farmer_id).first()
    
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    
    if farmer.coop_id != coop_id:
        raise HTTPException(status_code=403, detail="Farmer not in this cooperative")
    
    # Get farmer or coop location
    target_lat = farmer.lat
    target_lon = farmer.lon
    
    if target_lat is None or target_lon is None:
        # Fallback to cooperative center
        coop = db.query(CooperativeDB).filter(CooperativeDB.id == coop_id).first()
        if coop:
            target_lat = coop.center_lat
            target_lon = coop.center_lon
        else:
            raise HTTPException(
                status_code=400, 
                detail="Farmer location not set and cooperative not found"
            )
    
    # Load station data
    PROJECT_ROOT = Path(__file__).parent.parent.parent
    DATA_PATH = PROJECT_ROOT / 'dataset' / 'station_data_daily.csv'
    
    if not DATA_PATH.exists():
        # Return hardcoded stations if dataset not available
        stations = []
        for station_id in ['HCM01', 'HCM02', 'HCM03', 'HCM04']:
            station_loc = get_station_location(station_id)
            if station_loc:
                distance = haversine_distance(target_lat, target_lon, station_loc[0], station_loc[1])
                stations.append({
                    'station_id': station_id,
                    'distance_km': round(distance, 2),
                    'lat': station_loc[0],
                    'lon': station_loc[1]
                })
        stations.sort(key=lambda x: x['distance_km'])
        return {
            'farmer_id': farmer_id,
            'target_location': {'lat': target_lat, 'lon': target_lon},
            'suggested_stations': stations[:top_n],
            'current_station': farmer.station_id
        }
    
    # Load and find nearest stations
    try:
        df = pd.read_csv(DATA_PATH)
        nearest = find_nearest_stations(target_lat, target_lon, df, top_n=top_n)
        
        return {
            'farmer_id': farmer_id,
            'target_location': {'lat': target_lat, 'lon': target_lon},
            'suggested_stations': nearest,
            'current_station': farmer.station_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error finding stations: {str(e)}")
