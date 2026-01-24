"""Verify data is saved in PostgreSQL database."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.database_postgres import SessionLocal
from backend.db_models import UserDB, CooperativeDB, AlertConfigDB, StationDB


def verify_database():
    """Verify all data is saved in database."""
    db = SessionLocal()
    
    try:
        print("\n" + "=" * 70)
        print("🔍 DATABASE VERIFICATION - PostgreSQL")
        print("=" * 70)
        
        # Count cooperatives
        coop_count = db.query(CooperativeDB).count()
        print(f"\n✅ COOPERATIVES: {coop_count} records")
        if coop_count > 0:
            for coop in db.query(CooperativeDB).all():
                print(f"   - {coop.id}: {coop.name}")
        
        # Count users
        user_count = db.query(UserDB).count()
        print(f"\n✅ USERS: {user_count} records")
        if user_count > 0:
            for user in db.query(UserDB).all():
                print(f"   - {user.id}: {user.phone} ({user.name}) - Role: {user.role}")
        
        # Count alert configs
        alert_count = db.query(AlertConfigDB).count()
        print(f"\n✅ ALERT CONFIGS: {alert_count} records")
        if alert_count > 0:
            for alert in db.query(AlertConfigDB).all():
                print(f"   - ID {alert.id}: Coop {alert.coop_id} - Threshold: {alert.threshold_salinity}")
        
        # Count stations
        station_count = db.query(StationDB).count()
        print(f"\n✅ STATIONS: {station_count} records")
        if station_count > 0:
            for station in db.query(StationDB).all():
                print(f"   - {station.station_id}: {station.station_name}")
        
        print("\n" + "=" * 70)
        print("📊 TOTAL RECORDS:")
        print(f"   Cooperatives: {coop_count}")
        print(f"   Users: {user_count}")
        print(f"   Alert Configs: {alert_count}")
        print(f"   Stations: {station_count}")
        print("=" * 70)
        
        if coop_count > 0 and user_count > 0:
            print("\n✅ ✅ ✅ DATA IS SUCCESSFULLY SAVED IN POSTGRESQL! ✅ ✅ ✅\n")
        else:
            print("\n⚠️  No data found. Run: python backend/recreate_tables.py\n")
        
    except Exception as e:
        print(f"\n❌ Error connecting to database: {e}")
        print("\nMake sure:")
        print("  1. PostgreSQL is running: docker compose up -d postgres")
        print("  2. Database 'mekong_farm' exists")
        print("  3. Tables are created: python backend/recreate_tables.py")
    finally:
        db.close()


if __name__ == "__main__":
    verify_database()
