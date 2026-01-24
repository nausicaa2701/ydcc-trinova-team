"""Farmer management endpoints for COOP_ADMIN."""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
import uuid
import sys
from pathlib import Path
import pandas as pd

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.models import User, UserRole
from backend.database import users_db, hash_password, cooperatives_db
from backend.auth import require_role, require_coop_access, get_current_user
from backend.utils.geo_utils import find_nearest_stations, haversine_distance, get_station_location

router = APIRouter(prefix="/coops/{coop_id}/farmers", tags=["farmers"])


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
    metadata: dict = {}


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
        password_hash=hash_password(temp_password),
        lat=farmer.lat,
        lon=farmer.lon,
        station_id=farmer.station_id,
        crop_type=farmer.crop_type,
        crop_stage=farmer.crop_stage,
        threshold_salinity=farmer.threshold_salinity,
        storage_capacity_m3=farmer.storage_capacity_m3
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


@router.get("/{farmer_id}/suggest-stations")
async def suggest_stations_for_farmer(
    coop_id: str,
    farmer_id: str,
    top_n: int = Query(default=3, ge=1, le=10),
    current_user: User = Depends(get_current_user)
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
    
    if farmer_id not in users_db:
        raise HTTPException(status_code=404, detail="Farmer not found")
    
    farmer = users_db[farmer_id]
    if farmer.coop_id != coop_id:
        raise HTTPException(status_code=403, detail="Farmer not in this cooperative")
    
    # Get farmer or coop location
    target_lat = farmer.lat
    target_lon = farmer.lon
    
    if target_lat is None or target_lon is None:
        # Fallback to cooperative center
        if coop_id in cooperatives_db:
            coop = cooperatives_db[coop_id]
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
