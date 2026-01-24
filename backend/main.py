"""Main FastAPI application with auth and role-based access."""

import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.routers import auth, cooperatives, farmers, alerts, salinity_data, th2i_data, ai_forecast, recommendations
from backend.database_postgres import init_db

# Initialize database tables
try:
    init_db()
    print("Database tables initialized successfully")
except Exception as e:
    print(f"Warning: Could not initialize database tables: {e}")

app = FastAPI(
    title="Mekong Farm Management API",
    description="AI-driven salinity intrusion map with authentication and role-based access",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(cooperatives.router)
app.include_router(farmers.router)
app.include_router(alerts.router)
app.include_router(salinity_data.router)
app.include_router(th2i_data.router)
app.include_router(ai_forecast.router)
app.include_router(recommendations.router)

# AI forecasting endpoints are now integrated in backend/routers/ai_forecast.py


@app.get("/")
async def root():
    """API root endpoint."""
    return {
        "name": "Mekong Farm Management API",
        "version": "2.0.0",
        "endpoints": {
            "/auth": "Authentication endpoints",
            "/coops": "Cooperative management (SYSTEM_ADMIN)",
            "/coops/{id}/farmers": "Farmer management (COOP_ADMIN)",
            "/coops/{id}/farmers/{id}/suggest-stations": "Find nearest monitoring stations for farmer",
            "/coops/{id}/alerts": "Alert configuration (COOP_ADMIN)",
            "/api/salinity/latest": "Latest salinity station data from PDF extraction",
            "/api/th2i/latest": "Latest TH2I (HCMC TVHN) data from PDF extraction",
            "/api/ai/predict": "AI salinity prediction",
            "/api/ai/trend": "Trend analysis",
            "/api/ai/storage": "Storage planning",
            "/api/ai/mitigation": "Risk mitigation recommendations",
            "/api/ai/stations": "List of monitoring stations",
            "/api/recommendations/farmers/{id}": "Personalized farmer recommendations based on AI predictions",
            "/api/recommendations/coops/{id}/farmers": "Recommendations for all farmers in a cooperative"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)