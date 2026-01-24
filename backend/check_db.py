"""Check database records."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.database_postgres import SessionLocal
from backend.db_models import UserDB, CooperativeDB, AlertConfigDB, StationDB


def check_database():
    """Check all database records."""
    db = SessionLocal()
    
    try:
        print("=" * 60)
        print("📊 DATABASE RECORDS")
        print("=" * 60)
        
        # Cooperatives
        print("\n🏢 COOPERATIVES:")
        cooperatives = db.query(CooperativeDB).all()
        if cooperatives:
            for coop in cooperatives:
                print(f"  ID: {coop.id}")
                print(f"  Name: {coop.name}")
                print(f"  Province: {coop.province}")
                print(f"  Address: {coop.address}")
                print(f"  Center: ({coop.center_lat}, {coop.center_lon})")
                print(f"  Status: {coop.status}")
                print(f"  Config: {coop.config}")
                print()
        else:
            print("  No cooperatives found")
        
        # Users
        print("\n👥 USERS:")
        users = db.query(UserDB).all()
        if users:
            for user in users:
                print(f"  ID: {user.id}")
                print(f"  Phone: {user.phone}")
                print(f"  Name: {user.name}")
                print(f"  Role: {user.role}")
                print(f"  Coop ID: {user.coop_id}")
                if user.role == "FARMER":
                    print(f"  Location: ({user.lat}, {user.lon})")
                    print(f"  Crop: {user.crop_type} - {user.crop_stage}")
                    print(f"  Threshold Salinity: {user.threshold_salinity}")
                    print(f"  Storage Capacity: {user.storage_capacity_m3} m³")
                print()
        else:
            print("  No users found")
        
        # Alert Configs
        print("\n🚨 ALERT CONFIGS:")
        alert_configs = db.query(AlertConfigDB).all()
        if alert_configs:
            for config in alert_configs:
                print(f"  ID: {config.id}")
                print(f"  Coop ID: {config.coop_id}")
                print(f"  Threshold Salinity: {config.threshold_salinity} g/L")
                print(f"  Notify All Farmers: {config.notify_all_farmers}")
                print(f"  Message Template: {config.message_template}")
                print(f"  Enabled: {config.enabled}")
                print()
        else:
            print("  No alert configs found")
        
        # Stations
        print("\n📍 STATIONS:")
        stations = db.query(StationDB).all()
        if stations:
            for station in stations:
                print(f"  ID: {station.id}")
                print(f"  Station ID: {station.station_id}")
                print(f"  Name: {station.station_name}")
                print(f"  Location: ({station.lat}, {station.lon})")
                print(f"  Distance to Sea: {station.distance_to_sea_km} km")
                print(f"  Province: {station.province}")
                print()
        else:
            print("  No stations found")
        
        print("=" * 60)
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    check_database()
