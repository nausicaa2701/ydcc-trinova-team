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
    
    # Create cooperatives from HTX.md data (TPHCM)
    cooperatives_db = {
        "htx-hcm-001": Cooperative(
            id="htx-hcm-001",
            name="HTX Nông nghiệp-Dịch vụ Phước Long",
            province="TP. Hồ Chí Minh",
            address="Số 7- Đỗ Xuân Hợp, phường Phước Long B, Quận 9",
            center_lat=10.8422,
            center_lon=106.8099,
            status="active",
            config={"threshold_salinity": 4.0, "crops": ["rice", "shrimp"]}
        ),
        "htx-hcm-002": Cooperative(
            id="htx-hcm-002",
            name="HTX Nông nghiệp-Dịch vụ Linh Xuân",
            province="TP. Hồ Chí Minh",
            address="28A Xuân Trường, phường Linh Xuân, Thủ Đức",
            center_lat=10.8497,
            center_lon=106.7637,
            status="active",
            config={"threshold_salinity": 4.0, "crops": ["rice", "shrimp"]}
        ),
        "htx-hcm-003": Cooperative(
            id="htx-hcm-003",
            name="HTX Nông nghiệp-Dịch vụ Hiệp Bình Chánh",
            province="TP. Hồ Chí Minh",
            address="386 Kha Vạn Cân, KP5, phường Hiệp Bình Chánh, Thủ Đức",
            center_lat=10.8497,
            center_lon=106.7637,
            status="active",
            config={"threshold_salinity": 4.0, "crops": ["rice", "shrimp"]}
        ),
        "htx-hcm-004": Cooperative(
            id="htx-hcm-004",
            name="HTX Nông nghiệp-Dịch vụ Bình Chiểu",
            province="TP. Hồ Chí Minh",
            address="728 tỉnh lộ 43, KP3, phường Bình Chiểu, Thủ Đức",
            center_lat=10.8497,
            center_lon=106.7637,
            status="active",
            config={"threshold_salinity": 4.0, "crops": ["rice", "shrimp"]}
        ),
        "htx-hcm-005": Cooperative(
            id="htx-hcm-005",
            name="HTX Nông nghiệp-Dịch vụ Hiệp Bình Phước",
            province="TP. Hồ Chí Minh",
            address="6/151, quốc lộ 13, ấp 3, phường Hiệp Bình Phước, Thủ Đức",
            center_lat=10.8497,
            center_lon=106.7637,
            status="active",
            config={"threshold_salinity": 4.0, "crops": ["rice", "shrimp"]}
        ),
        "htx-hcm-006": Cooperative(
            id="htx-hcm-006",
            name="HTX Sản xuất-Dịch vụ nông nghiệp Bình Lợi",
            province="TP. Hồ Chí Minh",
            address="66/189, ấp 3, xã Bình Lợi, Bình Chánh",
            center_lat=10.6994,
            center_lon=106.6067,
            status="active",
            config={"threshold_salinity": 4.0, "crops": ["rice", "shrimp"]}
        ),
        "htx-hcm-007": Cooperative(
            id="htx-hcm-007",
            name="HTX Nông nghiệp Hoà Lộc",
            province="TP. Hồ Chí Minh",
            address="F7/16, ấp 6, xã Vĩnh Lộc A, Bình Chánh",
            center_lat=10.6994,
            center_lon=106.6067,
            status="active",
            config={"threshold_salinity": 4.0, "crops": ["rice", "shrimp"]}
        ),
        "htx-hcm-008": Cooperative(
            id="htx-hcm-008",
            name="HTXNN An Bình",
            province="TP. Hồ Chí Minh",
            address="B13/4 ấp 2, xã Vĩnh Lộc B, Bình Chánh",
            center_lat=10.6994,
            center_lon=106.6067,
            status="active",
            config={"threshold_salinity": 4.0, "crops": ["rice", "shrimp"]}
        ),
        "htx-hcm-009": Cooperative(
            id="htx-hcm-009",
            name="HTX NN Trang trại An Hạ",
            province="TP. Hồ Chí Minh",
            address="7K7/1, ấp 7, xã Phạm Văn Hai, Bình Chánh",
            center_lat=10.6994,
            center_lon=106.6067,
            status="active",
            config={"threshold_salinity": 4.0, "crops": ["rice", "shrimp"]}
        ),
        "htx-hcm-010": Cooperative(
            id="htx-hcm-010",
            name="HTX Nông nghiệp-Dịch vụ thương mại Phú Lợi",
            province="TP. Hồ Chí Minh",
            address="1436 đường Ba Tơ, phường 7, Quận 8",
            center_lat=10.74,
            center_lon=106.629,
            status="active",
            config={"threshold_salinity": 4.0, "crops": ["rice", "shrimp"]}
        ),
        "htx-hcm-011": Cooperative(
            id="htx-hcm-011",
            name="HTX Nông nghiệp Chiến Thắng",
            province="TP. Hồ Chí Minh",
            address="189 Bùi Minh Trực, phường 6, Quận 8",
            center_lat=10.74,
            center_lon=106.629,
            status="active",
            config={"threshold_salinity": 4.0, "crops": ["rice", "shrimp"]}
        ),
        "htx-hcm-012": Cooperative(
            id="htx-hcm-012",
            name="HTX Nông Nghiệp Dịch Vụ Thương Mại Phú Sơn",
            province="TP. Hồ Chí Minh",
            address="Rạch Cát – Bến Lức, Phường 7, Quận 8",
            center_lat=10.74,
            center_lon=106.629,
            status="active",
            config={"threshold_salinity": 4.0, "crops": ["rice", "shrimp"]}
        ),
        "htx-hcm-013": Cooperative(
            id="htx-hcm-013",
            name="HTX nuôi trồng thuỷ sản Hữu Nghị",
            province="TP. Hồ Chí Minh",
            address="Ấp Basa, xã Phước Hiệp, Củ Chi",
            center_lat=11.1572,
            center_lon=106.4967,
            status="active",
            config={"threshold_salinity": 4.0, "crops": ["shrimp", "fish"]}
        ),
        "htx-hcm-014": Cooperative(
            id="htx-hcm-014",
            name="HTX Nông nghiệp-Tiểu thủ công nghiệp Mỹ Khánh B",
            province="TP. Hồ Chí Minh",
            address="Ấp Mỹ Khánh B, xã Thái Mỹ, Củ Chi",
            center_lat=11.1572,
            center_lon=106.4967,
            status="active",
            config={"threshold_salinity": 4.0, "crops": ["rice", "vegetables"]}
        ),
        "htx-hcm-015": Cooperative(
            id="htx-hcm-015",
            name="HTX Sản xuất Rau an toàn Tân Phú Trung",
            province="TP. Hồ Chí Minh",
            address="Tổ 21, ấp Đình, xã Tân Phú Trung, Củ Chi",
            center_lat=11.1572,
            center_lon=106.4967,
            status="active",
            config={"threshold_salinity": 2.0, "crops": ["vegetables"]}
        ),
        "htx-hcm-016": Cooperative(
            id="htx-hcm-016",
            name="HTX nuôi trồng thuỷ sản Hà Quang",
            province="TP. Hồ Chí Minh",
            address="Ấp Bến Cỏ, xã Phú Hoà Đông (Tỉnh lộ 15, ấp Phú An, Phú Hoà Đông), Củ Chi",
            center_lat=11.1572,
            center_lon=106.4967,
            status="active",
            config={"threshold_salinity": 4.0, "crops": ["shrimp", "fish"]}
        ),
        "htx-hcm-017": Cooperative(
            id="htx-hcm-017",
            name="HTX Thủy sản Tương Lai",
            province="TP. Hồ Chí Minh",
            address="Ấp Cây Trâm, xã Phước Hiệp, Củ Chi",
            center_lat=11.1572,
            center_lon=106.4967,
            status="active",
            config={"threshold_salinity": 4.0, "crops": ["shrimp", "fish"]}
        ),
        "htx-hcm-018": Cooperative(
            id="htx-hcm-018",
            name="HTX DVNN Ba Lúa Vàng",
            province="TP. Hồ Chí Minh",
            address="Xã Trung Lập Hạ, Củ Chi",
            center_lat=11.1572,
            center_lon=106.4967,
            status="active",
            config={"threshold_salinity": 4.0, "crops": ["rice"]}
        ),
        "htx-hcm-019": Cooperative(
            id="htx-hcm-019",
            name="HTX NN Trần Hưng Đạo",
            province="TP. Hồ Chí Minh",
            address="Xã Tam Thôn Hiệp, Cần Giờ",
            center_lat=10.4114,
            center_lon=106.9547,
            status="active",
            config={"threshold_salinity": 4.0, "crops": ["rice", "shrimp"]}
        ),
        "htx-hcm-020": Cooperative(
            id="htx-hcm-020",
            name="HTX Nông nghiệp Xuân Lộc",
            province="TP. Hồ Chí Minh",
            address="520 A, Hà Huy Giáp, KP1, phường Thạnh Lộc, Quận 12",
            center_lat=10.8639,
            center_lon=106.6544,
            status="active",
            config={"threshold_salinity": 4.0, "crops": ["rice", "vegetables"]}
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
    
    # Coop Admins - TPHCM HTX (using chairman names from HTX.md)
    htx_admins = [
        ("htx-hcm-001", "0900000002", "Phạm Văn Huỳnh", "HTX Phước Long"),
        ("htx-hcm-002", "0900000003", "Vũ Trọng Hiếu", "HTX Linh Xuân"),
        ("htx-hcm-003", "0900000004", "Nguyễn Văn Đực", "HTX Hiệp Bình Chánh"),
        ("htx-hcm-004", "0900000005", "Hồ Hữu Nam", "HTX Bình Chiểu"),
        ("htx-hcm-005", "0900000006", "Nguyễn Hữu Chắng", "HTX Hiệp Bình Phước"),
        ("htx-hcm-006", "0900000007", "Lê Văn Hiền", "HTX Bình Lợi"),
        ("htx-hcm-007", "0900000008", "Trần Văn Liềng", "HTX Hoà Lộc"),
        ("htx-hcm-008", "0900000009", "Lê Mạnh Hùng", "HTX An Bình"),
        ("htx-hcm-009", "0900000010", "Trần Như Cường", "HTX An Hạ"),
        ("htx-hcm-010", "0900000011", "Trần Văn Nhựt", "HTX Phú Lợi"),
        ("htx-hcm-011", "0900000012", "Hồ Văn Đằng", "HTX Chiến Thắng"),
        ("htx-hcm-012", "0900000013", "Lê Bình Nghĩa", "HTX Phú Sơn"),
        ("htx-hcm-013", "0900000014", "Lâm Thị Trinh", "HTX Hữu Nghị"),
        ("htx-hcm-014", "0900000015", "Trần Văn Ngán", "HTX Mỹ Khánh B"),
        ("htx-hcm-015", "0900000016", "Nguyễn Quốc Toản", "HTX Tân Phú Trung"),
        ("htx-hcm-016", "0900000017", "Nguyễn Thị Kim Anh", "HTX Hà Quang"),
        ("htx-hcm-017", "0900000018", "Nguyễn Thị Ánh Lan", "HTX Tương Lai"),
        ("htx-hcm-018", "0900000019", "Nguyễn Văn Lành", "HTX Ba Lúa Vàng"),
        ("htx-hcm-019", "0900000020", "Võ Văn Dũng", "HTX Trần Hưng Đạo"),
        ("htx-hcm-020", "0900000021", "Trần Thị Hồng", "HTX Xuân Lộc"),
    ]
    
    for idx, (coop_id, phone, name, htx_name) in enumerate(htx_admins, 1):
        users_db[f"coop-admin-{idx:03d}"] = User(
            id=f"coop-admin-{idx:03d}",
            phone=phone,
            name=f"{name} - {htx_name}",
            role=UserRole.COOP_ADMIN,
            coop_id=coop_id,
            password_hash=hash_password("coop123")
        )
    
    # Farmers - Create 3-5 farmers for each HTX
    farmer_names = [
        "Nguyễn Văn", "Trần Thị", "Lê Văn", "Phạm Thị", "Hoàng Văn",
        "Võ Thị", "Đặng Văn", "Bùi Thị", "Ngô Văn", "Đỗ Thị",
        "Lý Văn", "Phan Thị", "Vũ Văn", "Đinh Thị", "Trương Văn",
        "Lương Thị", "Hồ Văn", "Dương Thị", "Mai Văn", "Lâm Thị",
        "Tôn Văn", "Chu Thị", "Lưu Văn", "Hà Thị", "Tạ Văn",
        "Đào Thị", "Nguyễn Thị", "Trần Văn", "Lê Thị", "Phạm Văn",
        "Hoàng Thị", "Võ Văn", "Đặng Thị", "Bùi Văn", "Ngô Thị",
        "Đỗ Văn", "Lý Thị", "Phan Văn", "Vũ Thị", "Đinh Văn",
        "Trương Thị", "Lương Văn", "Hồ Thị", "Dương Văn", "Mai Thị",
        "Lâm Văn", "Tôn Thị", "Chu Văn", "Lưu Thị", "Hà Văn",
        "Tạ Thị", "Đào Văn", "Nguyễn Văn", "Trần Thị", "Lê Văn",
        "Phạm Thị", "Hoàng Văn", "Võ Thị", "Đặng Văn", "Bùi Thị",
        "Ngô Văn", "Đỗ Thị", "Lý Văn", "Phan Thị", "Vũ Văn",
    ]
    
    farmer_counter = 1
    phone_counter = 100  # Start from 0900000100
    
    for coop_idx in range(1, 21):
        coop_id = f"htx-hcm-{coop_idx:03d}"
        # Create 3-5 farmers per HTX (randomized)
        num_farmers = 3 + (coop_idx % 3)  # 3, 4, or 5 farmers
        
        for farmer_idx in range(num_farmers):
            farmer_id = f"farmer-{farmer_counter:03d}"
            name_idx = (coop_idx * 3 + farmer_idx) % len(farmer_names)
            farmer_name = farmer_names[name_idx]
            phone = f"0900000{phone_counter:03d}"
            
            users_db[farmer_id] = User(
                id=farmer_id,
                phone=phone,
                name=f"{farmer_name} {chr(65 + farmer_idx)}",  # A, B, C, etc.
                role=UserRole.FARMER,
                coop_id=coop_id,
                password_hash=hash_password("farmer123")
            )
            
            farmer_counter += 1
            phone_counter += 1
    
    # Create alert configs for all HTX
    alert_configs_db = {}
    for coop_idx in range(1, 21):
        coop_id = f"htx-hcm-{coop_idx:03d}"
        # Get threshold from cooperative config, default to 4.0
        coop = cooperatives_db.get(coop_id)
        threshold = coop.config.get("threshold_salinity", 4.0) if coop else 4.0
        
        alert_configs_db[coop_id] = AlertConfig(
            coop_id=coop_id,
            threshold_salinity=threshold,
            notify_all_farmers=True
        )


# Initialize on import
init_db()

