# PostgreSQL Database Migration Guide

## Overview
The backend has been migrated from in-memory JSON storage to PostgreSQL database for persistent data management.

## Prerequisites
- PostgreSQL 16+ running on `localhost:5432`
- Python 3.10+
- SQLAlchemy 2.0+
- psycopg2-binary

## Installation Steps

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Set Up Environment Variables
Create a `.env` file in the project root:
```
# Database Configuration
DB_USER=postgres
DB_PASSWORD=postgres123
DB_NAME=mekong_farm

# Backend Configuration
SECRET_KEY=your-super-secret-key-change-this-in-production
ALGORITHM=HS256
PYTHON_ENV=production

# Frontend Configuration
VITE_MAPBOX_TOKEN=your_mapbox_token_here
VITE_API_URL=http://localhost:8000
```

### 3. Start PostgreSQL
```bash
docker compose up -d postgres
```

### 4. Initialize Database Tables and Sample Data
```bash
python backend/init_db.py
```

Output:
```
✅ Database initialized with sample data

Test credentials:
  SYSTEM_ADMIN: phone=0901234567, password=admin123
  COOP_ADMIN: phone=0987654321, password=coop123
  FARMER: phone=0911111111 or 0922222222, password=farmer123
```

### 5. Start Backend Server
```bash
cd ..
uvicorn backend.main:app --reload --port 8000
```

## Database Schema

### Tables
- **users** - User accounts with authentication
- **cooperatives** - Cooperative (HTX) information
- **alert_configs** - Alert configuration per cooperative
- **stations** - Monitoring stations

### Key Changes
1. **From**: In-memory dictionaries (`users_db`, `cooperatives_db`, `alert_configs_db`)
2. **To**: PostgreSQL tables with SQLAlchemy ORM

## API Changes

### Login Endpoint (No change to interface)
```bash
POST /auth/login
{
  "phone": "0901234567",
  "password": "admin123"
}
```

### Database Queries
All routers now use SQLAlchemy ORM to query the database instead of in-memory dicts:

**Old (JSON)**:
```python
user = users_db.get(user_id)
users_db[user_id] = user  # Update
```

**New (PostgreSQL)**:
```python
user = db.query(UserDB).filter(UserDB.id == user_id).first()
db.commit()  # Persist changes
```

## Updated Routers
- ✅ `backend/routers/auth.py` - Login, password change
- ⏳ `backend/routers/cooperatives.py` - (to be updated)
- ⏳ `backend/routers/farmers.py` - (to be updated)
- ⏳ `backend/routers/alerts.py` - (to be updated)

## Docker Compose

Run all services:
```bash
docker compose up -d
```

Services:
- **postgres** - Database (port 5432)
- **backend** - API server (port 8000)
- **frontend** - React app (port 5173)

## Troubleshooting

### Connection Refused (postgres)
```bash
docker compose logs postgres
# or check if port 5432 is in use
netstat -an | grep 5432
```

### Import Errors
Ensure backend path is in sys.path:
```python
sys.path.insert(0, str(Path(__file__).parent.parent))
```

### SQL Errors
Check database URL format:
```
postgresql://user:password@localhost:5432/database_name
```

## Next Steps
1. Update remaining routers (cooperatives, farmers, alerts) to use PostgreSQL
2. Create Alembic migrations for version control
3. Add data validation and error handling
4. Set up database backups
