"""Drop and recreate all database tables (warning: deletes all data)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.database_postgres import engine, Base
from backend.db_models import UserDB, CooperativeDB, AlertConfigDB, StationDB
import hashlib


def hash_password(password: str) -> str:
    """Hash password using SHA256."""
    return hashlib.sha256(password.encode()).hexdigest()


def recreate_tables():
    """Drop and recreate all database tables."""
    try:
        print("⚠️  Dropping existing tables...")
        Base.metadata.drop_all(bind=engine)
        print("✅ Tables dropped")
        
        print("Creating new tables...")
        Base.metadata.create_all(bind=engine)
        print("✅ Tables created successfully!")
        
        # List all tables
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        print(f"\nTables in database: {tables}")
        
        # Seed sample data
        print("\nSeeding sample data...")
        from backend.database_postgres import SessionLocal
        
        db = SessionLocal()
        
        try:
            # Create cooperatives
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
            
            # Create users
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
                UserDB(
                    id="user-003",
                    phone="0911111111",
                    name="Farmer - Nguyen Van A",
                    role="FARMER",
                    coop_id="htx-hcm-001",
                    lat=10.8422,
                    lon=106.8099,
                    crop_type="rice",
                    crop_stage="tillering",
                    threshold_salinity=4.0,
                    password_hash=hash_password("farmer123")
                ),
                UserDB(
                    id="user-004",
                    phone="0922222222",
                    name="Farmer - Tran Thi B",
                    role="FARMER",
                    coop_id="htx-hcm-002",
                    lat=10.8497,
                    lon=106.7637,
                    crop_type="shrimp",
                    crop_stage="seedling",
                    threshold_salinity=3.5,
                    password_hash=hash_password("farmer123")
                ),
            ]
            
            db.add_all(users)
            db.commit()
            
            print("✅ Sample data seeded")
            print("\nTest credentials:")
            print("  SYSTEM_ADMIN: phone=0901234567, password=admin123")
            print("  COOP_ADMIN: phone=0987654321, password=coop123")
            print("  FARMER: phone=0911111111 or 0922222222, password=farmer123")
            
        except Exception as e:
            db.rollback()
            print(f"❌ Error seeding data: {e}")
            raise
        finally:
            db.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        raise


if __name__ == "__main__":
    recreate_tables()
