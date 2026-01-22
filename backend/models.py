"""Database models for authentication and user management."""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum


class UserRole(str, Enum):
    """User roles."""
    SYSTEM_ADMIN = "SYSTEM_ADMIN"
    COOP_ADMIN = "COOP_ADMIN"
    FARMER = "FARMER"


class User(BaseModel):
    """User model."""
    id: str
    phone: str
    name: str
    role: UserRole
    coop_id: Optional[str] = None  # Only for COOP_ADMIN and FARMER
    password_hash: str  # Hashed password
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    class Config:
        use_enum_values = True


class Cooperative(BaseModel):
    """Cooperative (HTX) model."""
    id: str
    name: str
    province: str
    address: Optional[str] = None  # Full address (optional)
    center_lat: float
    center_lon: float
    status: str = "active"  # active, inactive
    config: dict = Field(default_factory=dict)  # JSON config for thresholds, crops, alerts
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class AlertConfig(BaseModel):
    """Alert configuration for a cooperative."""
    coop_id: str
    threshold_salinity: float = 4.0  # g/L
    notify_all_farmers: bool = True
    farmer_groups: list[str] = Field(default_factory=list)
    message_template: str = "Cảnh báo: Độ mặn vượt ngưỡng {threshold} g/L tại {coop_name}"

