"""Initialize database with sample data from HTX.md."""

import sys
from pathlib import Path
import os

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text
from sqlalchemy.exc import ProgrammingError
import hashlib


def hash_password(password: str) -> str:
    """Hash password using SHA256."""
    return hashlib.sha256(password.encode()).hexdigest()


def create_database():
    """Create the mekong_farm database if it doesn't exist."""
    # Connect to default postgres database
    default_db_url = "postgresql://postgres:postgres123@localhost:5432/postgres"
    
    try:
        engine = create_engine(default_db_url)
        with engine.connect() as conn:
            conn.execution_options(isolation_level="AUTOCOMMIT")
            
            # Check if database exists
            result = conn.execute(text("SELECT 1 FROM pg_database WHERE datname='mekong_farm'"))
            if not result.fetchone():
                print("Creating database 'mekong_farm'...")
                conn.execute(text("CREATE DATABASE mekong_farm"))
                print("✅ Database 'mekong_farm' created")
            else:
                print("✅ Database 'mekong_farm' already exists")
    except Exception as e:
        print(f"❌ Error creating database: {e}")
        raise


def init_sample_data():
    """Initialize database with sample cooperatives and users."""
    from backend.database_postgres import SessionLocal, init_db
    from backend.db_models import CooperativeDB, UserDB, StationDB, AlertConfigDB
    
    # Create database first
    create_database()
    
    # Create tables
    init_db()
    
    db = SessionLocal()
    
    try:
        # Clear existing data
        from backend.db_models import StationDB, AlertConfigDB
        db.query(UserDB).delete()
        db.query(AlertConfigDB).delete()
        db.query(StationDB).delete()
        db.query(CooperativeDB).delete()
        
        # Sample cooperatives from HTX.md
        cooperatives = [
            CooperativeDB(
                id="htx-hcm-001",
                name="HTX Nông nghiệp-Dịch vụ Phước Long",
                province="TP. Hồ Chí Minh",
                address="Số 7- Đỗ Xuân Hợp, phường Phước Long B, Quận 9",
                center_lat=10.8422,
                center_lon=106.8099,
                status="active",
                config={"threshold_salinity": 4.0, "crops": ["rice", "shrimp"]}
            ),
            CooperativeDB(
                id="htx-hcm-002",
                name="HTX Nông nghiệp-Dịch vụ Linh Xuân",
                province="TP. Hồ Chí Minh",
                address="28A Xuân Trường, phường Linh Xuân, Thủ Đức",
                center_lat=10.8497,
                center_lon=106.7637,
                status="active",
                config={"threshold_salinity": 4.0, "crops": ["rice", "shrimp"]}
            ),
            CooperativeDB(
                id="htx-hcm-003",
                name="HTX Nông nghiệp-Dịch vụ Bình Chánh",
                province="TP. Hồ Chí Minh",
                address="Bình Chánh District",
                center_lat=10.6994,
                center_lon=106.6067,
                status="active",
                config={"threshold_salinity": 4.0, "crops": ["rice", "shrimp"]}
            ),
        ]
        
        db.add_all(cooperatives)
        db.flush()
        
        # Sample users
        users = [
            UserDB(
                id="user-001",
                phone="0901234567",
                name="System Administrator",
                role="SYSTEM_ADMIN",
                password_hash=hash_password("admin123")
            ),
            UserDB(
                id="user-002",
                phone="0987654321",
                name="HTX Manager - Phước Long",
                role="COOP_ADMIN",
                coop_id="htx-hcm-001",
                password_hash=hash_password("coop123")
            ),
            # Farmers for HTX Phước Long
            UserDB(
                id="farmer-001",
                phone="0911111111",
                name="Nguyễn Văn A",
                role="FARMER",
                coop_id="htx-hcm-001",
                lat=10.8422,
                lon=106.8099,
                crop_type="rice",
                crop_stage="tillering",
                threshold_salinity=4.0,
                storage_capacity_m3=500.0,
                station_id="HCM01",
                password_hash=hash_password("111111")
            ),
            UserDB(
                id="farmer-002",
                phone="0912222222",
                name="Trần Thị B",
                role="FARMER",
                coop_id="htx-hcm-001",
                lat=10.8450,
                lon=106.8120,
                crop_type="shrimp",
                crop_stage="seedling",
                threshold_salinity=3.5,
                storage_capacity_m3=800.0,
                station_id="HCM01",
                password_hash=hash_password("222222")
            ),
            UserDB(
                id="farmer-003",
                phone="0913333333",
                name="Hoàng Văn C",
                role="FARMER",
                coop_id="htx-hcm-001",
                lat=10.8400,
                lon=106.8050,
                crop_type="rice",
                crop_stage="heading",
                threshold_salinity=4.0,
                storage_capacity_m3=600.0,
                station_id="HCM02",
                password_hash=hash_password("333333")
            ),
            # Farmers for HTX Linh Xuân
            UserDB(
                id="farmer-004",
                phone="0914444444",
                name="Lê Thị D",
                role="FARMER",
                coop_id="htx-hcm-002",
                lat=10.8497,
                lon=106.7637,
                crop_type="rice",
                crop_stage="seedling",
                threshold_salinity=4.0,
                storage_capacity_m3=700.0,
                station_id="HCM02",
                password_hash=hash_password("444444")
            ),
            UserDB(
                id="farmer-005",
                phone="0915555555",
                name="Phạm Văn E",
                role="FARMER",
                coop_id="htx-hcm-002",
                lat=10.8520,
                lon=106.7650,
                crop_type="shrimp",
                crop_stage="harvest",
                threshold_salinity=3.5,
                storage_capacity_m3=1000.0,
                station_id="HCM03",
                password_hash=hash_password("555555")
            ),
            # Farmers for HTX Bình Chánh
            UserDB(
                id="farmer-006",
                phone="0916666666",
                name="Vũ Thị F",
                role="FARMER",
                coop_id="htx-hcm-003",
                lat=10.6994,
                lon=106.6067,
                crop_type="rice",
                crop_stage="tillering",
                threshold_salinity=4.0,
                storage_capacity_m3=550.0,
                station_id="HCM04",
                password_hash=hash_password("666666")
            ),
        ]
        
        db.add_all(users)
        db.flush()
        
        # Sample monitoring stations
        stations = [
            StationDB(
                id="station-001",
                station_id="HCM01",
                station_name="Phước Long Monitoring Station",
                lat=10.8450,
                lon=106.8110,
                distance_to_sea_km=15.5,
                province="TP. Hồ Chí Minh"
            ),
            StationDB(
                id="station-002",
                station_id="HCM02",
                station_name="Linh Xuân Monitoring Station",
                lat=10.8500,
                lon=106.7640,
                distance_to_sea_km=18.2,
                province="TP. Hồ Chí Minh"
            ),
            StationDB(
                id="station-003",
                station_id="HCM03",
                station_name="Thủ Đức Monitoring Station",
                lat=10.8520,
                lon=106.7660,
                distance_to_sea_km=20.0,
                province="TP. Hồ Chí Minh"
            ),
            StationDB(
                id="station-004",
                station_id="HCM04",
                station_name="Bình Chánh Monitoring Station",
                lat=10.6980,
                lon=106.6050,
                distance_to_sea_km=25.5,
                province="TP. Hồ Chí Minh"
            ),
        ]
        
        db.add_all(stations)
        db.flush()
        
        # Assign stations to cooperatives (n-n relationship)
        # HTX Phước Long monitors stations HCM01 and HCM02
        coop_001 = db.query(CooperativeDB).filter(CooperativeDB.id == "htx-hcm-001").first()
        station_001 = db.query(StationDB).filter(StationDB.id == "station-001").first()
        station_002 = db.query(StationDB).filter(StationDB.id == "station-002").first()
        coop_001.stations.extend([station_001, station_002])
        
        # HTX Linh Xuân monitors stations HCM02 and HCM03
        coop_002 = db.query(CooperativeDB).filter(CooperativeDB.id == "htx-hcm-002").first()
        station_003 = db.query(StationDB).filter(StationDB.id == "station-003").first()
        coop_002.stations.extend([station_002, station_003])
        
        # HTX Bình Chánh monitors stations HCM04
        coop_003 = db.query(CooperativeDB).filter(CooperativeDB.id == "htx-hcm-003").first()
        station_004 = db.query(StationDB).filter(StationDB.id == "station-004").first()
        coop_003.stations.append(station_004)
        
        db.flush()
        alert_configs = [
            AlertConfigDB(
                coop_id="htx-hcm-001",
                threshold_salinity=4.0,
                notify_all_farmers=True,
                message_template="⚠️ Mục tiêu độ mặn {threshold}ppt đã được vượt quá tại {station_name}. Vui lòng kiểm tra nguồn nước.",
                enabled=True
            ),
            AlertConfigDB(
                coop_id="htx-hcm-002",
                threshold_salinity=3.5,
                notify_all_farmers=True,
                message_template="⚠️ Alert: Salinity exceeded {threshold}ppt at {station_name}",
                enabled=True
            ),
            AlertConfigDB(
                coop_id="htx-hcm-003",
                threshold_salinity=4.0,
                notify_all_farmers=True,
                message_template="⚠️ Cảnh báo: Độ mặn vượt ngưỡng {threshold}ppt",
                enabled=True
            ),
        ]
        
        db.add_all(alert_configs)
        db.add_all(alert_configs)
        db.commit()
        
        print("✅ Database initialized with sample data")
        print("\n📋 Sample Data Summary:")
        print(f"  Cooperatives: {db.query(CooperativeDB).count()}")
        print(f"  Users (total): {db.query(UserDB).count()}")
        print(f"    - SYSTEM_ADMIN: {db.query(UserDB).filter(UserDB.role == 'SYSTEM_ADMIN').count()}")
        print(f"    - COOP_ADMIN: {db.query(UserDB).filter(UserDB.role == 'COOP_ADMIN').count()}")
        print(f"    - FARMER: {db.query(UserDB).filter(UserDB.role == 'FARMER').count()}")
        print(f"  Stations: {db.query(StationDB).count()}")
        print(f"  Alert Configs: {db.query(AlertConfigDB).count()}")
        
        print("\n🔑 Test Credentials:")
        print("  SYSTEM_ADMIN: phone=0901234567, password=admin123")
        print("  COOP_ADMIN: phone=0987654321, password=coop123")
        print("  FARMER samples:")
        for farmer in db.query(UserDB).filter(UserDB.role == "FARMER").all():
            print(f"    - {farmer.name}: phone={farmer.phone}, password={farmer.phone[-6:]}")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error initializing database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    init_sample_data()
