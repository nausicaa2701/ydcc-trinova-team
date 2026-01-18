"""In-memory database for MVP (replace with real DB in production)."""

from typing import Dict, List, Optional
from datetime import datetime
import hashlib
from .models import User, UserRole, Cooperative, AlertConfig

# In-memory storage (replace with SQLite/PostgreSQL in production)
users_db: Dict[str, User] = {}
cooperatives_db: Dict[str, Cooperative] = {}
alert_configs_db: Dict[str, AlertConfig] = {}


def hash_password(password: str) -> str:
    """Hash password using SHA256 (use bcrypt in production)."""
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, password_hash: str) -> bool:
    """Verify password against hash."""
    return hash_password(password) == password_hash


def init_db():
    """Initialize database with sample data."""
    global users_db, cooperatives_db, alert_configs_db
    
    # Create sample cooperatives
    cooperatives_db = {
        "htx-tg-001": Cooperative(
            id="htx-tg-001",
            name="Hợp tác xã Nông nghiệp Mỹ Tho",
            province="Tiền Giang",
            center_lat=10.36,
            center_lon=106.36,
            status="active",
            config={"threshold_salinity": 4.0, "crops": ["rice", "shrimp"]}
        ),
        "htx-tg-002": Cooperative(
            id="htx-tg-002",
            name="Hợp tác xã Tôm - Lúa Cái Bè",
            province="Tiền Giang",
            center_lat=10.41,
            center_lon=105.97,
            status="active",
            config={"threshold_salinity": 3.5, "crops": ["rice-shrimp"]}
        ),
        "htx-tg-003": Cooperative(
            id="htx-tg-003",
            name="Hợp tác xã Cây ăn trái Gò Công",
            province="Tiền Giang",
            center_lat=10.36,
            center_lon=106.66,
            status="active",
            config={"threshold_salinity": 2.0, "crops": ["fruit", "coconut"]}
        ),
        "htx-tg-004": Cooperative(
            id="htx-tg-004",
            name="Hợp tác xã Lúa - Tôm Tân Phú Đông",
            province="Tiền Giang",
            center_lat=10.25,
            center_lon=106.50,
            status="active",
            config={"threshold_salinity": 3.0, "crops": ["rice-shrimp"]}
        ),
    }
    
    # Create sample users - System Admins
    users_db = {
        "admin-001": User(
            id="admin-001",
            phone="0900000001",
            name="Nguyễn Văn Admin",
            role=UserRole.SYSTEM_ADMIN,
            password_hash=hash_password("admin123")
        ),
        "admin-002": User(
            id="admin-002",
            phone="0900000010",
            name="Trần Thị Quản Trị",
            role=UserRole.SYSTEM_ADMIN,
            password_hash=hash_password("admin123")
        ),
    }
    
    # Coop Admins
    users_db.update({
        "coop-admin-001": User(
            id="coop-admin-001",
            phone="0900000002",
            name="Lê Văn HTX Mỹ Tho",
            role=UserRole.COOP_ADMIN,
            coop_id="htx-tg-001",
            password_hash=hash_password("coop123")
        ),
        "coop-admin-002": User(
            id="coop-admin-002",
            phone="0900000011",
            name="Phạm Thị HTX Cái Bè",
            role=UserRole.COOP_ADMIN,
            coop_id="htx-tg-002",
            password_hash=hash_password("coop123")
        ),
        "coop-admin-003": User(
            id="coop-admin-003",
            phone="0900000020",
            name="Hoàng Văn HTX Gò Công",
            role=UserRole.COOP_ADMIN,
            coop_id="htx-tg-003",
            password_hash=hash_password("coop123")
        ),
        "coop-admin-004": User(
            id="coop-admin-004",
            phone="0900000021",
            name="Võ Thị HTX Tân Phú Đông",
            role=UserRole.COOP_ADMIN,
            coop_id="htx-tg-004",
            password_hash=hash_password("coop123")
        ),
    })
    
    # Farmers - HTX Mỹ Tho (htx-tg-001)
    users_db.update({
        "farmer-001": User(
            id="farmer-001",
            phone="0900000003",
            name="Nguyễn Văn A",
            role=UserRole.FARMER,
            coop_id="htx-tg-001",
            password_hash=hash_password("farmer123")
        ),
        "farmer-002": User(
            id="farmer-002",
            phone="0900000004",
            name="Trần Thị B",
            role=UserRole.FARMER,
            coop_id="htx-tg-001",
            password_hash=hash_password("farmer123")
        ),
        "farmer-003": User(
            id="farmer-003",
            phone="0900000005",
            name="Lê Văn C",
            role=UserRole.FARMER,
            coop_id="htx-tg-001",
            password_hash=hash_password("farmer123")
        ),
    })
    
    # Farmers - HTX Cái Bè (htx-tg-002)
    users_db.update({
        "farmer-004": User(
            id="farmer-004",
            phone="0900000012",
            name="Phạm Văn D",
            role=UserRole.FARMER,
            coop_id="htx-tg-002",
            password_hash=hash_password("farmer123")
        ),
        "farmer-005": User(
            id="farmer-005",
            phone="0900000013",
            name="Hoàng Thị E",
            role=UserRole.FARMER,
            coop_id="htx-tg-002",
            password_hash=hash_password("farmer123")
        ),
    })
    
    # Farmers - HTX Gò Công (htx-tg-003)
    users_db.update({
        "farmer-006": User(
            id="farmer-006",
            phone="0900000022",
            name="Võ Văn F",
            role=UserRole.FARMER,
            coop_id="htx-tg-003",
            password_hash=hash_password("farmer123")
        ),
        "farmer-007": User(
            id="farmer-007",
            phone="0900000023",
            name="Đặng Thị G",
            role=UserRole.FARMER,
            coop_id="htx-tg-003",
            password_hash=hash_password("farmer123")
        ),
    })
    
    # Farmers - HTX Tân Phú Đông (htx-tg-004)
    users_db.update({
        "farmer-008": User(
            id="farmer-008",
            phone="0900000030",
            name="Bùi Văn H",
            role=UserRole.FARMER,
            coop_id="htx-tg-004",
            password_hash=hash_password("farmer123")
        ),
        "farmer-009": User(
            id="farmer-009",
            phone="0900000031",
            name="Ngô Thị I",
            role=UserRole.FARMER,
            coop_id="htx-tg-004",
            password_hash=hash_password("farmer123")
        ),
    })
    
    # Create alert configs
    alert_configs_db = {
        "htx-tg-001": AlertConfig(
            coop_id="htx-tg-001",
            threshold_salinity=4.0,
            notify_all_farmers=True
        ),
        "htx-tg-002": AlertConfig(
            coop_id="htx-tg-002",
            threshold_salinity=3.5,
            notify_all_farmers=True
        ),
        "htx-tg-003": AlertConfig(
            coop_id="htx-tg-003",
            threshold_salinity=2.0,
            notify_all_farmers=True
        ),
        "htx-tg-004": AlertConfig(
            coop_id="htx-tg-004",
            threshold_salinity=3.0,
            notify_all_farmers=True
        ),
    }


# Initialize on import
init_db()

