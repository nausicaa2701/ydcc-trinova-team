"""FastAPI server for Tiền Giang salinity forecasting API."""

import os
import sys
from pathlib import Path
from typing import Optional, List, Dict
from datetime import datetime, timedelta
import torch
import numpy as np
import pandas as pd
import joblib
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

sys.path.append(str(Path(__file__).parent.parent))
from utils.data_loader import load_tiengiang_data, prepare_features
from utils.models import LSTMModel, GRUModel
from utils.risk_scoring import calculate_risk_score, predict_risk_class

app = FastAPI(title="Tiền Giang Salinity Forecasting API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODELS_DIR = Path(__file__).parent.parent / 'models'
DATA_PATH = Path(__file__).parent.parent.parent / 'dataset' / 'mekong_delta_salinity_stations.csv'

models_cache = {}
scalers_cache = {}
risk_models_cache = {}


def load_models():
    """Load all models into cache."""
    global models_cache, scalers_cache, risk_models_cache
    
    lstm_path = list(MODELS_DIR.glob('lstm_*_h7*.ckpt'))
    gru_path = list(MODELS_DIR.glob('gru_*_h30*.ckpt'))
    
    if lstm_path:
        models_cache['lstm'] = LSTMModel.load_from_checkpoint(str(lstm_path[0]))
        models_cache['lstm'].eval()
        scaler_path = MODELS_DIR / f"lstm_{lstm_path[0].stem.split('_')[1]}_h7_scaler.pkl"
        if scaler_path.exists():
            scalers_cache['lstm'] = joblib.load(scaler_path)
    
    if gru_path:
        models_cache['gru'] = GRUModel.load_from_checkpoint(str(gru_path[0]))
        models_cache['gru'].eval()
        scaler_path = MODELS_DIR / f"gru_{gru_path[0].stem.split('_')[1]}_h30_scaler.pkl"
        if scaler_path.exists():
            scalers_cache['gru'] = joblib.load(scaler_path)
    
    risk_lr_path = MODELS_DIR / 'risk_logistic_regression.pkl'
    risk_rf_path = MODELS_DIR / 'risk_random_forest.pkl'
    
    if risk_lr_path.exists():
        risk_models_cache['logistic_regression'] = joblib.load(risk_lr_path)
    if risk_rf_path.exists():
        risk_models_cache['random_forest'] = joblib.load(risk_rf_path)


@app.on_event("startup")
async def startup_event():
    """Load models on startup."""
    load_models()


class PredictionRequest(BaseModel):
    station_id: Optional[str] = None
    horizon_days: int = 7
    date: Optional[str] = None


class PredictionResponse(BaseModel):
    date: str
    horizon_days: int
    predictions: Dict[str, List[float]]
    boundaries: Dict
    risk_scores: Dict[str, float]
    confidence: float


@app.get("/")
async def root():
    """API root endpoint."""
    return {
        "name": "Tiền Giang Salinity Forecasting API",
        "version": "1.0.0",
        "endpoints": {
            "/predict": "Get salinity predictions",
            "/boundaries": "Get salinity boundaries (1‰ and 4‰)",
            "/risk": "Get risk scores",
            "/health": "Health check"
        }
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "models_loaded": {
            "lstm": "lstm" in models_cache,
            "gru": "gru" in models_cache,
            "risk": len(risk_models_cache) > 0
        }
    }


@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """Predict salinity for Tiền Giang stations."""
    if request.horizon_days <= 7:
        model_key = 'lstm'
        seq_length = 30
    else:
        model_key = 'gru'
        seq_length = 60
    
    if model_key not in models_cache:
        raise HTTPException(status_code=503, detail=f"{model_key.upper()} model not loaded")
    
    model = models_cache[model_key]
    scaler = scalers_cache.get(model_key)
    
    if scaler is None:
        raise HTTPException(status_code=503, detail="Scaler not loaded")
    
    df = load_tiengiang_data(str(DATA_PATH))
    df_features = prepare_features(df)
    
    stations = ['TG01', 'TG02', 'TG03', 'TG04', 'TG05']
    if request.station_id:
        stations = [request.station_id] if request.station_id in stations else stations
    
    predictions = {}
    risk_scores = {}
    
    feature_cols = [
        'salinity_ppt', 'discharge_TC_m3s', 'tide_vungtau_m',
        'rainfall_mm', 'water_level_m', 'nino34_anom',
        'salinity_lag_1d', 'salinity_lag_7d', 'discharge_lag_1d',
        'distance_to_sea_km', 'elevation_m', 'month', 'day_of_year'
    ]
    
    for station_id in stations:
        station_df = df_features[df_features['station_id'] == station_id].sort_values('date')
        
        if len(station_df) < seq_length:
            continue
        
        last_sequence = station_df[feature_cols].tail(seq_length).values
        last_sequence_scaled = scaler.transform(last_sequence)
        
        X = torch.FloatTensor(last_sequence_scaled).unsqueeze(0)
        
        with torch.no_grad():
            y_pred = model(X).numpy()[0]
        
        dummy_features = np.zeros((len(y_pred), len(feature_cols)))
        dummy_features[:, 0] = y_pred
        y_pred_unscaled = scaler.inverse_transform(dummy_features)[:, 0]
        
        predictions[station_id] = y_pred_unscaled.tolist()
        
        risk_score = calculate_risk_score(y_pred_unscaled[0])
        risk_scores[station_id] = float(risk_score)
    
    boundaries = generate_boundaries(predictions)
    
    return PredictionResponse(
        date=request.date or datetime.now().isoformat(),
        horizon_days=request.horizon_days,
        predictions=predictions,
        boundaries=boundaries,
        risk_scores=risk_scores,
        confidence=0.85
    )


@app.get("/boundaries")
async def get_boundaries(
    date: Optional[str] = None,
    threshold_1ppt: float = 1.0,
    threshold_4ppt: float = 4.0
):
    """Get salinity boundaries for 1‰ and 4‰ thresholds."""
    request = PredictionRequest(horizon_days=7, date=date)
    response = await predict(request)
    
    return response.boundaries


@app.get("/risk")
async def get_risk(
    station_id: Optional[str] = None,
    date: Optional[str] = None
):
    """Get risk scores for stations."""
    request = PredictionRequest(station_id=station_id, horizon_days=7, date=date)
    response = await predict(request)
    
    return {
        "date": response.date,
        "risk_scores": response.risk_scores,
        "risk_levels": {
            sid: "high" if score >= 75 else "medium" if score >= 50 else "low"
            for sid, score in response.risk_scores.items()
        }
    }


def generate_boundaries(predictions: Dict[str, List[float]]) -> Dict:
    """Generate salinity boundaries GeoJSON."""
    station_coords = {
        'TG01': (10.36, 106.36),
        'TG02': (10.41, 105.97),
        'TG03': (10.27, 106.74),
        'TG04': (10.28, 106.83),
        'TG05': (10.40, 106.74),
    }
    
    features = []
    
    for threshold in [1.0, 4.0]:
        stations_above = []
        for station_id, pred in predictions.items():
            if pred[0] >= threshold:
                stations_above.append(station_id)
        
        if len(stations_above) >= 3:
            coords = []
            for sid in stations_above:
                lat, lon = station_coords.get(sid, (10.0, 106.0))
                coords.append([lon, lat])
            
            if len(coords) >= 3:
                coords.append(coords[0])
                features.append({
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Polygon',
                        'coordinates': [coords]
                    },
                    'properties': {
                        'salinity': threshold,
                        'confidence': 0.85
                    }
                })
    
    return {
        'type': 'FeatureCollection',
        'features': features
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

