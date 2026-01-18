"""Main FastAPI application with auth and role-based access."""

import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.routers import auth, cooperatives, farmers, alerts

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

# Note: Salinity forecasting endpoints are in tiengiang-salinity-forecasting/api/main.py
# They can run on the same port or be proxied separately


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
            "/coops/{id}/alerts": "Alert configuration (COOP_ADMIN)",
            "/forecast": "Salinity forecasting API (existing)"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

