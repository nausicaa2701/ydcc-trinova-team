"""SQLAlchemy ORM models for PostgreSQL."""

from sqlalchemy import Column, String, Float, DateTime, Boolean, JSON, ForeignKey, Integer, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from backend.database_postgres import Base


# Junction table for cooperative-station many-to-many relationship
cooperative_stations = Table(
    'cooperative_stations',
    Base.metadata,
    Column('coop_id', String(50), ForeignKey('cooperatives.id'), primary_key=True),
    Column('station_id', String(50), ForeignKey('stations.id'), primary_key=True)
)


class UserDB(Base):
    """User database model."""
    __tablename__ = "users"

    id = Column(String(50), primary_key=True, index=True)
    phone = Column(String(20), unique=True, index=True)
    name = Column(String(255))
    role = Column(String(20), index=True)  # SYSTEM_ADMIN, COOP_ADMIN, FARMER
    coop_id = Column(String(50), ForeignKey("cooperatives.id"), nullable=True)
    password_hash = Column(String(256))
    
    # Farm context
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)
    station_id = Column(String(50), ForeignKey("stations.id"), nullable=True)  # Primary monitoring station (n-1: many farmers to one station)
    crop_type = Column(String(100), nullable=True)
    crop_stage = Column(String(100), nullable=True)
    threshold_salinity = Column(Float, nullable=True)
    storage_capacity_m3 = Column(Float, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    cooperative = relationship("CooperativeDB", back_populates="users")
    station = relationship("StationDB", back_populates="farmers")  # n-1: many farmers, one station


class CooperativeDB(Base):
    """Cooperative database model."""
    __tablename__ = "cooperatives"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(255))
    province = Column(String(255))
    address = Column(String(500), nullable=True)
    center_lat = Column(Float)
    center_lon = Column(Float)
    status = Column(String(20), default="active")  # active, inactive
    config = Column(JSON, nullable=True)  # Store JSON config
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    users = relationship("UserDB", back_populates="cooperative")
    alert_configs = relationship("AlertConfigDB", back_populates="cooperative")
    stations = relationship("StationDB", secondary=cooperative_stations, back_populates="cooperatives")  # n-n: many cooperatives, many stations


class AlertConfigDB(Base):
    """Alert configuration database model."""
    __tablename__ = "alert_configs"

    id = Column(Integer, primary_key=True, index=True)
    coop_id = Column(String(50), ForeignKey("cooperatives.id"))
    threshold_salinity = Column(Float, default=4.0)
    notify_all_farmers = Column(Boolean, default=True)
    farmer_groups = Column(JSON, nullable=True)  # List of farmer group IDs
    message_template = Column(String(500))
    enabled = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    cooperative = relationship("CooperativeDB", back_populates="alert_configs")


class StationDB(Base):
    """Monitoring station database model."""
    __tablename__ = "stations"

    id = Column(String(50), primary_key=True, index=True)
    station_id = Column(String(50), unique=True, index=True)
    station_name = Column(String(255))
    lat = Column(Float)
    lon = Column(Float)
    distance_to_sea_km = Column(Float, nullable=True)
    province = Column(String(255))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    cooperatives = relationship("CooperativeDB", secondary=cooperative_stations, back_populates="stations")  # n-n: many cooperatives, many stations
    farmers = relationship("UserDB", back_populates="station")  # 1-n: one station, many farmers

