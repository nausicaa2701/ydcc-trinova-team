"""Alert configuration and notification endpoints."""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import httpx
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.models import User, UserRole, AlertConfig
from backend.database import alert_configs_db, cooperatives_db, users_db
from backend.auth import require_coop_access, get_current_user

router = APIRouter(prefix="/coops/{coop_id}/alerts", tags=["alerts"])


class AlertConfigUpdate(BaseModel):
    threshold_salinity: float = 4.0
    notify_all_farmers: bool = True
    farmer_groups: list[str] = []
    message_template: str = "Cảnh báo: Độ mặn vượt ngưỡng {threshold} g/L tại {coop_name}"


# Fake n8n webhook URL (replace with real URL in production)
N8N_WEBHOOK_URL = "https://n8n.example.com/webhook/zalo-alert"


@router.get("/config")
async def get_alert_config(
    coop_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get alert configuration for cooperative."""
    # Check access
    if current_user.role != UserRole.SYSTEM_ADMIN:
        if current_user.role != UserRole.COOP_ADMIN or current_user.coop_id != coop_id:
            raise HTTPException(status_code=403, detail="Access denied to this cooperative")
    
    if coop_id not in alert_configs_db:
        # Return default config
        return {
            "coop_id": coop_id,
            "threshold_salinity": 4.0,
            "notify_all_farmers": True,
            "farmer_groups": [],
            "message_template": "Cảnh báo: Độ mặn vượt ngưỡng {threshold} g/L tại {coop_name}"
        }
    
    return alert_configs_db[coop_id].dict()


@router.put("/config")
async def update_alert_config(
    coop_id: str,
    config: AlertConfigUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update alert configuration (COOP_ADMIN only)."""
    # Check access
    if current_user.role != UserRole.SYSTEM_ADMIN:
        if current_user.role != UserRole.COOP_ADMIN or current_user.coop_id != coop_id:
            raise HTTPException(status_code=403, detail="Access denied to this cooperative")
    
    alert_config = AlertConfig(
        coop_id=coop_id,
        threshold_salinity=config.threshold_salinity,
        notify_all_farmers=config.notify_all_farmers,
        farmer_groups=config.farmer_groups,
        message_template=config.message_template
    )
    alert_configs_db[coop_id] = alert_config
    
    return {"message": "Alert config updated", "config": alert_config.dict()}


@router.post("/test")
async def test_alert(
    coop_id: str,
    current_user: User = Depends(get_current_user)
):
    """Test alert notification by sending to n8n webhook (COOP_ADMIN only)."""
    # Check access
    if current_user.role != UserRole.SYSTEM_ADMIN:
        if current_user.role != UserRole.COOP_ADMIN or current_user.coop_id != coop_id:
            raise HTTPException(status_code=403, detail="Access denied to this cooperative")
    
    # Get farmers in this coop
    farmers = [
        user for user in users_db.values()
        if user.coop_id == coop_id and user.role == UserRole.FARMER
    ]
    
    if not farmers:
        raise HTTPException(status_code=400, detail="No farmers found in this cooperative")
    
    # Get cooperative info
    coop = cooperatives_db.get(coop_id)
    coop_name = coop.name if coop else "Cooperative"
    
    # Get alert config
    config = alert_configs_db.get(coop_id)
    threshold = config.threshold_salinity if config else 4.0
    
    # Prepare message
    message = f"Cảnh báo: Độ mặn vượt ngưỡng {threshold} g/L tại {coop_name}"
    
    # Prepare webhook payload
    payload = {
        "coop_id": coop_id,
        "coop_name": coop_name,
        "farmer_phones": [f.phone for f in farmers],
        "message": message,
        "threshold": threshold,
        "test": True
    }
    
    # Send to n8n webhook (fake URL for now)
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                N8N_WEBHOOK_URL,
                json=payload,
                timeout=5.0
            )
            # In production, check response.status_code
            return {
                "message": "Test alert sent",
                "farmer_count": len(farmers),
                "webhook_response": "success" if response.status_code < 400 else "error"
            }
    except Exception as e:
        # In MVP, return success even if webhook fails (it's a fake URL)
        return {
            "message": "Test alert prepared (webhook may not be reachable)",
            "farmer_count": len(farmers),
            "payload": payload,
            "note": "This is a test. Webhook URL may not be accessible."
        }

