"""Farmer recommendation engine based on AI predictions and farm context."""

from typing import List, Optional, Dict
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
import sys
from pathlib import Path
import httpx

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.models import User, UserRole
from backend.database import users_db, cooperatives_db
from backend.auth import get_current_user

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])


class ActionRecommendation(BaseModel):
    action: str  # "allow_pumping", "postpone_pumping", "store_water", "alert", "harvest_early"
    priority: str  # "low", "medium", "high", "critical"
    reason: str
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
    details: Optional[Dict] = None


class FarmerRecommendation(BaseModel):
    farmer_id: str
    farmer_name: str
    coop_id: str
    station_id: str
    current_date: str
    horizon_days: int
    threshold_salinity: float
    crop_type: Optional[str] = None
    crop_stage: Optional[str] = None
    risk_level: str  # "low", "medium", "high", "critical"
    days_above_threshold: int
    max_salinity_predicted: float
    recommendations: List[ActionRecommendation]
    safe_pumping_windows: List[Dict]  # [{date, salinity, is_safe}]


def analyze_predictions_for_farmer(
    farmer: User,
    predictions: List[float],
    start_date: str,
    threshold: float
) -> Dict:
    """Analyze salinity predictions and generate recommendations for a farmer."""
    
    # Count days above threshold
    days_above = sum(1 for sal in predictions if sal > threshold)
    max_salinity = max(predictions) if predictions else 0
    
    # Determine risk level
    if max_salinity <= threshold:
        risk_level = "low"
    elif days_above <= 5:
        risk_level = "medium"
    elif days_above <= 15:
        risk_level = "high"
    else:
        risk_level = "critical"
    
    # Find safe pumping windows (consecutive days below threshold)
    safe_windows = []
    current_window = []
    base_date = datetime.fromisoformat(start_date)
    
    for i, salinity in enumerate(predictions):
        date = (base_date + timedelta(days=i)).isoformat()[:10]
        
        if salinity <= threshold:
            current_window.append({
                'date': date,
                'day_index': i,
                'salinity': round(salinity, 2),
                'is_safe': True
            })
        else:
            if current_window:
                safe_windows.append(current_window)
                current_window = []
            safe_windows.append([{
                'date': date,
                'day_index': i,
                'salinity': round(salinity, 2),
                'is_safe': False
            }])
    
    if current_window:
        safe_windows.append(current_window)
    
    # Flatten safe windows for response
    all_days = []
    for window in safe_windows:
        all_days.extend(window)
    
    # Generate recommendations
    recommendations = []
    
    # 1. Pumping recommendations
    if days_above == 0:
        recommendations.append(ActionRecommendation(
            action="allow_pumping",
            priority="low",
            reason=f"Tất cả {len(predictions)} ngày tới đều an toàn (≤ {threshold} g/L)",
            details={'safe_days': len(predictions)}
        ))
    elif days_above <= 5:
        # Find first safe window
        safe_days = [d for d in all_days if d['is_safe']]
        if safe_days:
            first_safe = safe_days[0]['date']
            last_safe = safe_days[-1]['date'] if len(safe_days) > 0 else first_safe
            recommendations.append(ActionRecommendation(
                action="allow_pumping",
                priority="medium",
                reason=f"Chỉ {days_above} ngày vượt ngưỡng. Ưu tiên bơm trong khung giờ an toàn.",
                valid_from=first_safe,
                valid_until=last_safe,
                details={'safe_days_count': len(safe_days)}
            ))
    else:
        # Many days above threshold
        unsafe_days = [d for d in all_days if not d['is_safe']]
        if unsafe_days:
            first_unsafe = unsafe_days[0]['date']
            recommendations.append(ActionRecommendation(
                action="postpone_pumping",
                priority="high" if days_above <= 15 else "critical",
                reason=f"Cảnh báo: {days_above}/{len(predictions)} ngày vượt ngưỡng {threshold} g/L",
                valid_from=first_unsafe,
                details={
                    'days_above_threshold': days_above,
                    'max_salinity': round(max_salinity, 2)
                }
            ))
    
    # 2. Storage recommendations
    if farmer.storage_capacity_m3 and days_above > 3:
        safe_days = [d for d in all_days if d['is_safe']][:3]  # First 3 safe days
        if safe_days:
            recommendations.append(ActionRecommendation(
                action="store_water",
                priority="high",
                reason=f"Dự trữ nước trong {len(safe_days)} ngày an toàn trước khi mặn tăng",
                valid_until=safe_days[-1]['date'],
                details={
                    'storage_capacity_m3': farmer.storage_capacity_m3,
                    'recommended_fill_dates': [d['date'] for d in safe_days]
                }
            ))
    
    # 3. Crop-specific recommendations
    if farmer.crop_type:
        if farmer.crop_type.lower() in ['rice', 'lúa'] and max_salinity > threshold + 2:
            recommendations.append(ActionRecommendation(
                action="alert",
                priority="critical",
                reason=f"Lúa rất nhạy mặn. Độ mặn dự báo {round(max_salinity, 1)} g/L cao hơn ngưỡng.",
                details={
                    'crop_type': farmer.crop_type,
                    'max_salinity': round(max_salinity, 2),
                    'threshold': threshold
                }
            ))
        
        if farmer.crop_type.lower() in ['shrimp', 'tôm'] and max_salinity < 2.0:
            recommendations.append(ActionRecommendation(
                action="alert",
                priority="medium",
                reason="Độ mặn thấp có thể ảnh hưởng tôm nuôi. Theo dõi và điều chỉnh.",
                details={
                    'crop_type': farmer.crop_type,
                    'min_salinity': round(min(predictions), 2)
                }
            ))
    
    # 4. Harvest/planting recommendations
    if farmer.crop_stage and risk_level in ['high', 'critical']:
        if farmer.crop_stage.lower() in ['flowering', 'ra hoa', 'trổ', 'làm đòng']:
            recommendations.append(ActionRecommendation(
                action="alert",
                priority="critical",
                reason="Giai đoạn nhạy cảm với mặn. Cần hành động ngay.",
                details={
                    'crop_stage': farmer.crop_stage,
                    'risk_level': risk_level
                }
            ))
        elif farmer.crop_stage.lower() in ['mature', 'chín', 'thu hoạch']:
            recommendations.append(ActionRecommendation(
                action="harvest_early",
                priority="high",
                reason="Cân nhắc thu hoạch sớm trước khi mặn tăng cao",
                details={
                    'crop_stage': farmer.crop_stage,
                    'days_until_critical': days_above
                }
            ))
    
    return {
        'risk_level': risk_level,
        'days_above_threshold': days_above,
        'max_salinity_predicted': round(max_salinity, 2),
        'recommendations': recommendations,
        'safe_pumping_windows': all_days
    }


@router.get("/farmers/{farmer_id}", response_model=FarmerRecommendation)
async def get_farmer_recommendations(
    farmer_id: str,
    horizon_days: int = Query(default=7, ge=1, le=30),
    current_user: User = Depends(get_current_user)
):
    """
    Get personalized recommendations for a farmer based on AI predictions.
    
    Requires farmer to have a station_id assigned.
    """
    # Check access
    if current_user.role not in [UserRole.SYSTEM_ADMIN, UserRole.COOP_ADMIN]:
        if current_user.role == UserRole.FARMER and current_user.id != farmer_id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    if farmer_id not in users_db:
        raise HTTPException(status_code=404, detail="Farmer not found")
    
    farmer = users_db[farmer_id]
    
    if not farmer.station_id:
        raise HTTPException(
            status_code=400,
            detail="Farmer does not have a monitoring station assigned. Use /suggest-stations endpoint first."
        )
    
    # Get threshold (farmer override or coop default)
    threshold = farmer.threshold_salinity
    if threshold is None and farmer.coop_id in cooperatives_db:
        coop = cooperatives_db[farmer.coop_id]
        threshold = coop.config.get('threshold_salinity', 4.0)
    if threshold is None:
        threshold = 4.0  # Default
    
    # Call AI prediction API
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Assuming API is running on same host
            response = await client.get(
                f"http://localhost:8000/api/ai/predict",
                params={
                    'station_id': farmer.station_id,
                    'horizon_days': horizon_days
                }
            )
            response.raise_for_status()
            prediction_data = response.json()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get predictions from AI service: {str(e)}"
        )
    
    # Extract predictions for this station
    station_predictions = prediction_data.get('predictions', {}).get(farmer.station_id)
    if not station_predictions:
        raise HTTPException(
            status_code=404,
            detail=f"No predictions available for station {farmer.station_id}"
        )
    
    # Analyze and generate recommendations
    start_date = prediction_data.get('date', datetime.now().isoformat()[:10])
    analysis = analyze_predictions_for_farmer(
        farmer=farmer,
        predictions=station_predictions,
        start_date=start_date,
        threshold=threshold
    )
    
    return FarmerRecommendation(
        farmer_id=farmer.id,
        farmer_name=farmer.name,
        coop_id=farmer.coop_id,
        station_id=farmer.station_id,
        current_date=start_date,
        horizon_days=horizon_days,
        threshold_salinity=threshold,
        crop_type=farmer.crop_type,
        crop_stage=farmer.crop_stage,
        **analysis
    )


@router.get("/coops/{coop_id}/farmers", response_model=List[FarmerRecommendation])
async def get_coop_farmers_recommendations(
    coop_id: str,
    horizon_days: int = Query(default=7, ge=1, le=30),
    current_user: User = Depends(get_current_user)
):
    """
    Get recommendations for all farmers in a cooperative.
    
    COOP_ADMIN can see all farmers in their coop.
    SYSTEM_ADMIN can see any coop.
    """
    # Check access
    if current_user.role != UserRole.SYSTEM_ADMIN:
        if current_user.role != UserRole.COOP_ADMIN or current_user.coop_id != coop_id:
            raise HTTPException(status_code=403, detail="Access denied to this cooperative")
    
    # Get all farmers in coop
    farmers = [
        user for user in users_db.values()
        if user.role == UserRole.FARMER and user.coop_id == coop_id and user.station_id
    ]
    
    if not farmers:
        return []
    
    # Get recommendations for each farmer
    recommendations = []
    for farmer in farmers:
        try:
            # Reuse the single farmer endpoint logic
            rec = await get_farmer_recommendations(
                farmer_id=farmer.id,
                horizon_days=horizon_days,
                current_user=current_user
            )
            recommendations.append(rec)
        except Exception as e:
            # Skip farmers with errors but continue processing others
            print(f"Error getting recommendations for farmer {farmer.id}: {e}")
            continue
    
    return recommendations
