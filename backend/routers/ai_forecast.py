"""AI Forecasting API endpoints for salinity prediction, risk scoring, trend analysis, etc."""

import os
import sys
from pathlib import Path
from typing import Optional, List, Dict
from datetime import datetime, timedelta
import torch
import numpy as np
import pandas as pd
import joblib
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from backend.utils.realtime_config import (
    REALTIME_STEP_MINUTES,
    REALTIME_SEQ_LENGTH,
    REALTIME_HORIZON_STEPS,
)

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from backend.utils.data_loader import load_tiengiang_data, prepare_features, get_all_stations
from backend.utils.models import LSTMModel, GRUModel
from backend.utils.risk_scoring import calculate_risk_score, predict_risk_class
from backend.utils.trend_analysis import calculate_trend, analyze_seasonal_pattern, forecast_trend, compare_periods
from backend.utils.storage_planning import calculate_days_of_supply, calculate_optimal_fill_date, estimate_storage_requirements
from backend.utils.risk_mitigation import calculate_harvest_deadline, generate_mitigation_recommendations, find_safe_operational_window

router = APIRouter(prefix="/api/ai", tags=["AI Forecasting"])

# Paths relative to project root
PROJECT_ROOT = Path(__file__).parent.parent.parent
MODELS_DIR = PROJECT_ROOT / 'backend' / 'models'

# Dataset path: allow overriding via environment for (daily or realtime) datasets
_default_daily = PROJECT_ROOT / 'dataset' / 'station_data_daily.csv'
_default_realtime = PROJECT_ROOT / 'dataset' / 'station_data_realtime.csv'

env_dataset_path = os.getenv("SALINITY_DATASET_PATH")
if env_dataset_path:
    DATA_PATH = Path(env_dataset_path)
else:
    # Prefer enriched real-time dataset if it exists, else fall back to daily
    if _default_realtime.exists():
        DATA_PATH = _default_realtime
    else:
        DATA_PATH = _default_daily

if not DATA_PATH.exists():
    # Final fallback to mock dataset
    DATA_PATH = PROJECT_ROOT / 'dataset' / 'mekong_delta_salinity_stations.csv'

# Explicit realtime dataset path for short-term 30-minute model
REALTIME_DATA_PATH = PROJECT_ROOT / 'dataset' / 'station_data_realtime.csv'

models_cache = {}
scalers_cache = {}
risk_models_cache = {}
all_stations_cache = []


def load_models():
    """Load all models into cache."""
    global models_cache, scalers_cache, risk_models_cache
    
    # Find LSTM model (h7 or h16)
    lstm_path = list(MODELS_DIR.glob('lstm_*_h7*.ckpt'))
    if not lstm_path:
        lstm_path = list(MODELS_DIR.glob('lstm_*_h*.ckpt'))
    
    # Find GRU model (h30, h18, or h16)
    gru_path = list(MODELS_DIR.glob('gru_*_h30*.ckpt'))
    if not gru_path:
        gru_path = list(MODELS_DIR.glob('gru_*_h18*.ckpt'))
    if not gru_path:
        gru_path = list(MODELS_DIR.glob('gru_*_h16*.ckpt'))
    if not gru_path:
        gru_path = list(MODELS_DIR.glob('gru_*_h*.ckpt'))
    
    if lstm_path:
        models_cache['lstm'] = LSTMModel.load_from_checkpoint(str(lstm_path[0]))
        models_cache['lstm'].eval()
        # Try to find scaler (could be h7, h16, etc.)
        scaler_path = MODELS_DIR / f"lstm_multi_h7_scaler.pkl"
        if not scaler_path.exists():
            # Try to find any lstm scaler
            scaler_path = list(MODELS_DIR.glob('lstm_*_scaler.pkl'))
            scaler_path = scaler_path[0] if scaler_path else None
        if scaler_path and Path(scaler_path).exists():
            scalers_cache['lstm'] = joblib.load(scaler_path)
    
    if gru_path:
        models_cache['gru'] = GRUModel.load_from_checkpoint(str(gru_path[0]))
        models_cache['gru'].eval()
        # Try to find scaler (could be h30, h18, h16, etc.)
        scaler_path = MODELS_DIR / f"gru_multi_h30_scaler.pkl"
        if not scaler_path.exists():
            scaler_path = MODELS_DIR / f"gru_multi_h18_scaler.pkl"
        if not scaler_path.exists():
            scaler_path = MODELS_DIR / f"gru_multi_h16_scaler.pkl"
        if not scaler_path.exists():
            # Try to find any gru scaler
            scaler_path = list(MODELS_DIR.glob('gru_*_scaler.pkl'))
            scaler_path = scaler_path[0] if scaler_path else None
        if scaler_path and Path(scaler_path).exists():
            scalers_cache['gru'] = joblib.load(scaler_path)

    # Optional: load short-term real-time LSTM model (30-minute resolution)
    realtime_lstm_path = list(MODELS_DIR.glob('lstm_realtime_*.ckpt'))
    if realtime_lstm_path:
        try:
            models_cache['lstm_realtime'] = LSTMModel.load_from_checkpoint(str(realtime_lstm_path[0]))
            models_cache['lstm_realtime'].eval()
            rt_scaler_path = MODELS_DIR / 'lstm_realtime_scaler.pkl'
            if rt_scaler_path.exists():
                scalers_cache['lstm_realtime'] = joblib.load(rt_scaler_path)
        except Exception as e:
            print(f"Warning: Could not load realtime LSTM model: {e}")
    
    risk_lr_path = MODELS_DIR / 'risk_logistic_regression.pkl'
    risk_rf_path = MODELS_DIR / 'risk_random_forest.pkl'
    
    if risk_lr_path.exists():
        risk_models_cache['logistic_regression'] = joblib.load(risk_lr_path)
    if risk_rf_path.exists():
        risk_models_cache['random_forest'] = joblib.load(risk_rf_path)


# Load models on module import
try:
    load_models()
    print(f"AI Models loaded: LSTM={('lstm' in models_cache)}, GRU={('gru' in models_cache)}, Risk={len(risk_models_cache) > 0}")
    
    # Load all available stations from dataset
    if DATA_PATH.exists():
        try:
            print(f"Loading stations from {DATA_PATH}...")
            all_stations_cache = get_all_stations(str(DATA_PATH))
            print(f"Loaded {len(all_stations_cache)} stations: {all_stations_cache[:5]}...")
        except Exception as e:
            print(f"Warning: Could not load stations: {e}")
            all_stations_cache = []
    else:
        print(f"Warning: Dataset file not found: {DATA_PATH}")
        all_stations_cache = []
except Exception as e:
    print(f"Warning: Could not load AI models: {e}")
    import traceback
    traceback.print_exc()


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


class RealtimePredictionRequest(BaseModel):
    station_id: Optional[str] = None
    # History length used for context (minutes); default = 24h
    history_minutes: int = REALTIME_SEQ_LENGTH * REALTIME_STEP_MINUTES


class RealtimeForecastPoint(BaseModel):
    timestamp: str
    step_index: int
    salinity: float


class RealtimePredictionResponse(BaseModel):
    station_id: str
    step_minutes: int
    horizon_steps: int
    history_start: str
    history_end: str
    current_salinity: float
    forecast: List[RealtimeForecastPoint]
    summary: Dict


@router.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "models_loaded": {
            "lstm": "lstm" in models_cache,
            "gru": "gru" in models_cache,
            "lstm_realtime": "lstm_realtime" in models_cache,
            "risk": len(risk_models_cache) > 0
        }
    }


@router.get("/stations")
async def get_stations():
    """Get list of all available stations from dataset."""
    try:
        if not DATA_PATH.exists():
            raise HTTPException(status_code=500, detail=f"Dataset file not found: {DATA_PATH}")
        
        # Use cached stations if available
        if all_stations_cache:
            # Load only unique rows for metadata (much faster)
            df_sample = pd.read_csv(DATA_PATH, nrows=10000)  # Sample first 10k rows
            station_metadata = []
            
            for station_id in all_stations_cache:
                station_df = df_sample[df_sample['station_id'] == station_id]
                if len(station_df) > 0:
                    station_row = station_df.iloc[0]
                    metadata = {
                        'station_id': station_id,
                        'lat': float(station_row.get('lat', 0)) if pd.notna(station_row.get('lat')) else 0.0,
                        'lon': float(station_row.get('lon', 0)) if pd.notna(station_row.get('lon')) else 0.0,
                        'distance_to_sea_km': float(station_row.get('distance_to_sea_km', 0)) if pd.notna(station_row.get('distance_to_sea_km')) else 0.0,
                        'elevation_m': float(station_row.get('elevation_m', 0)) if pd.notna(station_row.get('elevation_m')) else 0.0,
                    }
                    if 'station_name' in station_row and pd.notna(station_row['station_name']):
                        metadata['station_name'] = str(station_row['station_name'])
                    if 'province' in station_row and pd.notna(station_row['province']):
                        metadata['province'] = str(station_row['province'])
                    station_metadata.append(metadata)
            
            return {
                'stations': station_metadata,
                'count': len(station_metadata)
            }
        
        # Fallback: load all stations (slower)
        stations = get_all_stations(str(DATA_PATH))
        
        # Load only unique rows for metadata (much faster than full dataset)
        df_sample = pd.read_csv(DATA_PATH, nrows=10000)  # Sample first 10k rows
        station_metadata = []
        
        for station_id in stations:
            station_df = df_sample[df_sample['station_id'] == station_id]
            if len(station_df) > 0:
                station_row = station_df.iloc[0]
                metadata = {
                    'station_id': station_id,
                    'lat': float(station_row.get('lat', 0)) if pd.notna(station_row.get('lat')) else 0.0,
                    'lon': float(station_row.get('lon', 0)) if pd.notna(station_row.get('lon')) else 0.0,
                    'distance_to_sea_km': float(station_row.get('distance_to_sea_km', 0)) if pd.notna(station_row.get('distance_to_sea_km')) else 0.0,
                    'elevation_m': float(station_row.get('elevation_m', 0)) if pd.notna(station_row.get('elevation_m')) else 0.0,
                }
                if 'station_name' in station_row and pd.notna(station_row['station_name']):
                    metadata['station_name'] = str(station_row['station_name'])
                if 'province' in station_row and pd.notna(station_row['province']):
                    metadata['province'] = str(station_row['province'])
                station_metadata.append(metadata)
        
        return {
            'stations': station_metadata,
            'count': len(station_metadata)
        }
    except Exception as e:
        import traceback
        error_detail = f"{str(e)}\n{traceback.format_exc()}"
        raise HTTPException(status_code=500, detail=error_detail)


@router.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """Predict salinity for all stations."""
    try:
        if request.horizon_days <= 7:
            model_key = 'lstm'
            seq_length = 30
        else:
            model_key = 'gru'
            seq_length = 60
        
        if model_key not in models_cache:
            raise HTTPException(
                status_code=503, 
                detail=f"{model_key.upper()} model not loaded. Available models: {list(models_cache.keys())}"
            )
        
        model = models_cache[model_key]
        scaler = scalers_cache.get(model_key)
        
        if scaler is None:
            raise HTTPException(
                status_code=503, 
                detail=f"Scaler not loaded for {model_key}. Available scalers: {list(scalers_cache.keys())}"
            )
        
        if not DATA_PATH.exists():
            raise HTTPException(status_code=500, detail=f"Dataset file not found: {DATA_PATH}")
        
        df = load_tiengiang_data(str(DATA_PATH), station_ids=None)
        if df is None or len(df) == 0:
            raise HTTPException(status_code=500, detail="Failed to load dataset or dataset is empty")
        
        df_features = prepare_features(df)
        
        # Get all available stations from dataset
        available_stations = sorted(df_features['station_id'].unique().tolist())
        
        if request.station_id:
            if request.station_id not in available_stations:
                raise HTTPException(status_code=404, detail=f"Station {request.station_id} not found in dataset")
            stations = [request.station_id]
        else:
            stations = available_stations
        
        predictions = {}
        risk_scores = {}
        
        feature_cols = [
            'salinity_ppt', 'discharge_TC_m3s', 'tide_vungtau_m',
            'rainfall_mm', 'water_level_m', 'nino34_anom',
            'salinity_lag_1d', 'salinity_lag_7d', 'discharge_lag_1d',
            'distance_to_sea_km', 'elevation_m', 'month', 'day_of_year'
        ]
        
        for station_id in stations:
            try:
                station_df = df_features[df_features['station_id'] == station_id].sort_values('date')
                
                if len(station_df) < seq_length:
                    print(f"Warning: Station {station_id} has insufficient data ({len(station_df)} < {seq_length})")
                    continue
                
                last_sequence = station_df[feature_cols].tail(seq_length).values
                last_sequence_scaled = scaler.transform(last_sequence)
                
                # Get device from model
                device = next(model.parameters()).device
                X = torch.FloatTensor(last_sequence_scaled).unsqueeze(0).to(device)
                
                with torch.no_grad():
                    y_pred = model(X).cpu().numpy()[0]
                
                dummy_features = np.zeros((len(y_pred), len(feature_cols)))
                dummy_features[:, 0] = y_pred
                y_pred_unscaled = scaler.inverse_transform(dummy_features)[:, 0]
                
                predictions[station_id] = y_pred_unscaled.tolist()
                
                risk_score = calculate_risk_score(y_pred_unscaled[0])
                risk_scores[station_id] = float(risk_score)
            except Exception as e:
                print(f"Error processing station {station_id}: {e}")
                import traceback
                traceback.print_exc()
                continue
        
        boundaries = generate_boundaries(predictions, df_features)
        
        return PredictionResponse(
            date=request.date or datetime.now().isoformat(),
            horizon_days=request.horizon_days,
            predictions=predictions,
            boundaries=boundaries,
            risk_scores=risk_scores,
            confidence=0.85
        )
    except Exception as e:
        import traceback
        error_detail = f"{str(e)}\n{traceback.format_exc()}"
        raise HTTPException(status_code=500, detail=error_detail)


@router.get("/boundaries")
async def get_boundaries(
    date: Optional[str] = None,
    threshold_1ppt: float = 1.0,
    threshold_4ppt: float = 4.0
):
    """Get salinity boundaries for 1‰ and 4‰ thresholds."""
    try:
        request = PredictionRequest(horizon_days=7, date=date)
        response = await predict(request)
        return response.boundaries
    except Exception as e:
        import traceback
        error_detail = f"{str(e)}\n{traceback.format_exc()}"
        raise HTTPException(status_code=500, detail=error_detail)


@router.get("/risk")
async def get_risk(
    station_id: Optional[str] = None,
    date: Optional[str] = None
):
    """Get risk scores for stations."""
    try:
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
    except Exception as e:
        import traceback
        error_detail = f"{str(e)}\n{traceback.format_exc()}"
        raise HTTPException(status_code=500, detail=error_detail)


def get_station_coords_from_data(df: pd.DataFrame) -> Dict[str, tuple]:
    """Get station coordinates from dataset."""
    coords = {}
    if 'lat' in df.columns and 'lon' in df.columns:
        for station_id in df['station_id'].unique():
            station_data = df[df['station_id'] == station_id].iloc[0]
            coords[station_id] = (float(station_data['lat']), float(station_data['lon']))
    return coords


def generate_boundaries(predictions: Dict[str, List[float]], df: Optional[pd.DataFrame] = None) -> Dict:
    """Generate salinity boundaries GeoJSON."""
    # Try to get coordinates from dataset
    station_coords = {}
    if df is not None:
        station_coords = get_station_coords_from_data(df)
    
    # Fallback to hardcoded coordinates if dataset doesn't have them
    if not station_coords:
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


def _load_realtime_station_series(station_id: Optional[str]) -> pd.DataFrame:
    """Helper: load realtime series for a specific station, sorted by datetime."""
    if not REALTIME_DATA_PATH.exists():
        raise HTTPException(
            status_code=500,
            detail=f"Realtime dataset file not found: {REALTIME_DATA_PATH}",
        )

    df = pd.read_csv(REALTIME_DATA_PATH)
    if "date" not in df.columns or "time" not in df.columns:
        raise HTTPException(
            status_code=500,
            detail="Realtime dataset must contain 'date' and 'time' columns.",
        )

    df["datetime"] = pd.to_datetime(df["date"] + " " + df["time"])

    if station_id:
        df = df[df["station_id"] == station_id].copy()
        if df.empty:
            raise HTTPException(
                status_code=404,
                detail=f"Station {station_id} not found in realtime dataset",
            )
    else:
        # Default to first station in dataset
        first_station = df["station_id"].iloc[0]
        df = df[df["station_id"] == first_station].copy()
        station_id = first_station

    df = df.sort_values("datetime").reset_index(drop=True)
    return df


@router.post("/realtime_predict", response_model=RealtimePredictionResponse)
async def realtime_predict(request: RealtimePredictionRequest):
    """
    Short-term (6–24h) real-time salinity forecast at 30-minute resolution.

    Uses LSTM model trained on `station_data_realtime.csv` with history window
    REALTIME_SEQ_LENGTH and horizon REALTIME_HORIZON_STEPS.
    """
    try:
        model_key = "lstm_realtime"
        if model_key not in models_cache:
            raise HTTPException(
                status_code=503,
                detail="Realtime LSTM model not loaded. "
                "Train it with backend/train_realtime_lstm.py and restart backend.",
            )
        model = models_cache[model_key]
        scaler = scalers_cache.get(model_key)
        if scaler is None:
            raise HTTPException(
                status_code=503,
                detail="Realtime scaler not loaded for LSTM. "
                "Ensure lstm_realtime_scaler.pkl exists in backend/models.",
            )

        df_station = _load_realtime_station_series(request.station_id)
        station_id = df_station["station_id"].iloc[0]

        # Determine history length in steps
        history_steps = max(
            REALTIME_SEQ_LENGTH, request.history_minutes // REALTIME_STEP_MINUTES
        )

        if len(df_station) < history_steps:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Not enough realtime history for station {station_id}. "
                    f"Need at least {history_steps} records, got {len(df_station)}"
                ),
            )

        history_df = df_station.tail(history_steps).copy()

        feature_cols = [
            "salinity_ppt",
            "discharge_TC_m3s",
            "tide_vungtau_m",
            "rainfall_mm",
            "water_level_m",
            "nino34_anom",
            "salinity_lag_1d",
            "salinity_lag_7d",
            "discharge_lag_1d",
            "distance_to_sea_km",
            "elevation_m",
            "month",
            "day_of_year",
        ]

        for col in feature_cols:
            if col not in history_df.columns:
                history_df[col] = 0.0

        feature_values = history_df[feature_cols].astype(float).values
        feature_values_scaled = scaler.transform(feature_values)

        # Use last REALTIME_SEQ_LENGTH steps as model input
        if len(feature_values_scaled) < REALTIME_SEQ_LENGTH:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Not enough history for model window (need {REALTIME_SEQ_LENGTH}, "
                    f"got {len(feature_values_scaled)})"
                ),
            )

        window_scaled = feature_values_scaled[-REALTIME_SEQ_LENGTH:]
        device = next(model.parameters()).device
        X = torch.FloatTensor(window_scaled).unsqueeze(0).to(device)

        with torch.no_grad():
            y_scaled = model(X).cpu().numpy()[0]  # shape: (HORIZON_STEPS,)

        # Inverse-transform forecast using scaler
        dummy = np.zeros((len(y_scaled), len(feature_cols)))
        dummy[:, 0] = y_scaled
        unscaled = scaler.inverse_transform(dummy)[:, 0]

        current_row = history_df.iloc[-1]
        current_salinity = float(current_row["salinity_ppt"])
        last_timestamp = pd.to_datetime(
            current_row["date"] + " " + current_row["time"]
        )

        # Build forecast timeline
        horizon_steps = REALTIME_HORIZON_STEPS
        forecast_points: List[RealtimeForecastPoint] = []
        for i in range(horizon_steps):
            ts = last_timestamp + timedelta(
                minutes=(i + 1) * REALTIME_STEP_MINUTES
            )
            forecast_points.append(
                RealtimeForecastPoint(
                    timestamp=ts.isoformat(),
                    step_index=i,
                    salinity=float(unscaled[i]),
                )
            )

        # Simple real-time risk summary over next 6h and 24h
        steps_6h = min(horizon_steps, max(1, 6 * 60 // REALTIME_STEP_MINUTES))
        steps_24h = min(horizon_steps, max(1, 24 * 60 // REALTIME_STEP_MINUTES))

        arr = np.array([p.salinity for p in forecast_points])
        max_6h = float(arr[:steps_6h].max()) if steps_6h > 0 and len(arr) else 0.0
        max_24h = float(arr[:steps_24h].max()) if steps_24h > 0 and len(arr) else 0.0

        def _first_cross(threshold: float) -> Optional[str]:
            for p in forecast_points:
                if p.salinity >= threshold:
                    return p.timestamp
            return None

        first_cross_1 = _first_cross(1.0)
        first_cross_4 = _first_cross(4.0)

        # Risk level based on short-term behaviour
        if current_salinity >= 4.0 or max_6h >= 4.0:
            risk_level = "danger"
        elif current_salinity >= 1.0 or max_6h >= 1.0:
            risk_level = "warning"
        elif max_24h >= 1.0:
            risk_level = "watch"
        else:
            risk_level = "safe"

        summary = {
            "station_id": station_id,
            "current_salinity": current_salinity,
            "max_salinity_6h": max_6h,
            "max_salinity_24h": max_24h,
            "first_crossing_1ppt": first_cross_1,
            "first_crossing_4ppt": first_cross_4,
            "risk_level": risk_level,
            "step_minutes": REALTIME_STEP_MINUTES,
        }

        history_start = history_df["datetime"].iloc[0].isoformat()
        history_end = history_df["datetime"].iloc[-1].isoformat()

        return RealtimePredictionResponse(
            station_id=station_id,
            step_minutes=REALTIME_STEP_MINUTES,
            horizon_steps=horizon_steps,
            history_start=history_start,
            history_end=history_end,
            current_salinity=current_salinity,
            forecast=forecast_points,
            summary=summary,
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback

        error_detail = f"{str(e)}\n{traceback.format_exc()}"
        raise HTTPException(status_code=500, detail=error_detail)


@router.get("/trend")
async def get_trend_analysis(
    station_id: Optional[str] = None,
    days: int = 30
):
    """Get trend analysis for salinity data."""
    try:
        if not DATA_PATH.exists():
            raise HTTPException(status_code=500, detail=f"Dataset file not found: {DATA_PATH}")
        
        df = load_tiengiang_data(str(DATA_PATH), station_ids=None)
        if df is None or len(df) == 0:
            raise HTTPException(status_code=500, detail="Failed to load dataset or dataset is empty")
        
        df_features = prepare_features(df)
        
        # Get all available stations from dataset
        available_stations = sorted(df_features['station_id'].unique().tolist())
        
        if station_id:
            if station_id not in available_stations:
                raise HTTPException(status_code=404, detail=f"Station {station_id} not found in dataset")
            stations = [station_id]
        else:
            stations = available_stations
        
        trends = {}
        
        for sid in stations:
            station_df = df_features[df_features['station_id'] == sid].sort_values('date')
            
            if len(station_df) < 7:
                continue
            
            # Get recent data
            recent_data = station_df.tail(days)
            salinity_values = recent_data['salinity_ppt'].values
            dates = pd.to_datetime(recent_data['date'])
            
            # Calculate trend
            trend_stats = calculate_trend(salinity_values, dates)
            
            # Seasonal analysis
            seasonal = analyze_seasonal_pattern(df_features, sid)
            
            # Forecast trend
            forecast = forecast_trend(salinity_values, forecast_days=7)
            
            # Compare with previous period
            if len(station_df) >= days * 2:
                previous_data = station_df.iloc[-days*2:-days]
                previous_values = previous_data['salinity_ppt'].values
                comparison = compare_periods(salinity_values, previous_values)
            else:
                comparison = {'change_percent': 0.0, 'change_absolute': 0.0, 'is_worse': False}
            
            trends[sid] = {
                'trend': trend_stats,
                'seasonal': seasonal,
                'forecast': forecast,
                'comparison': comparison
            }
        
        return {
            'date': datetime.now().isoformat(),
            'analysis_period_days': days,
            'trends': trends
        }
    except Exception as e:
        import traceback
        error_detail = f"{str(e)}\n{traceback.format_exc()}"
        raise HTTPException(status_code=500, detail=error_detail)


@router.get("/storage")
async def get_storage_planning(
    station_id: Optional[str] = None,
    current_level_percent: float = 68.0,
    daily_consumption_m3: float = 1000.0,
    total_capacity_m3: float = 50000.0,
    horizon_days: int = 30
):
    """Get storage planning recommendations."""
    try:
        # Get predictions
        request = PredictionRequest(station_id=station_id, horizon_days=horizon_days)
        response = await predict(request)
        
        # Check if we have predictions
        if not response.predictions or len(response.predictions) == 0:
            raise HTTPException(
                status_code=500, 
                detail="No predictions available. Ensure models are loaded and dataset contains data."
            )
        
        # Use first station's predictions or average
        if station_id and station_id in response.predictions:
            forecasted_salinity = response.predictions[station_id]
            if not forecasted_salinity or len(forecasted_salinity) == 0:
                raise HTTPException(
                    status_code=500,
                    detail=f"No predictions available for station {station_id}"
                )
        elif response.predictions:
            # Average across all stations
            all_preds = [p for p in response.predictions.values() if p and len(p) > 0]
            if not all_preds:
                raise HTTPException(
                    status_code=500,
                    detail="No valid predictions available from any station"
                )
            # Ensure all predictions have the same length
            min_len = min(len(p) for p in all_preds)
            forecasted_salinity = [float(np.mean([p[i] for p in all_preds])) for i in range(min_len)]
        else:
            raise HTTPException(
                status_code=500,
                detail="No predictions available"
            )
        
        # Ensure forecasted_salinity is a list of floats
        if not isinstance(forecasted_salinity, list):
            forecasted_salinity = list(forecasted_salinity) if hasattr(forecasted_salinity, '__iter__') else []
        
        # Convert all values to float
        forecasted_salinity = [float(x) for x in forecasted_salinity]
        
        # Calculate days of supply
        supply_info = calculate_days_of_supply(
            current_level_percent=current_level_percent,
            daily_consumption_rate=daily_consumption_m3,
            total_capacity=total_capacity_m3,
            forecasted_salinity=forecasted_salinity,
            safe_salinity_threshold=1.0
        )
        
        # Estimate storage requirements
        storage_req = estimate_storage_requirements(
            forecasted_salinity=forecasted_salinity,
            daily_consumption_rate=daily_consumption_m3,
            safe_salinity_threshold=1.0
        )
        
        # Optimal fill date
        optimal_fill = calculate_optimal_fill_date(
            forecasted_salinity=forecasted_salinity,
            safe_salinity_threshold=1.0
        )
        
        return {
            'date': datetime.now().isoformat(),
            'current_level_percent': current_level_percent,
            'days_of_supply': supply_info['days_remaining'],
            'shortfall_date': supply_info['shortfall_date'],
            'safe_window_days': supply_info['safe_window_days'],
            'optimal_fill_date': optimal_fill,
            'storage_requirements': storage_req,
            'recommendations': supply_info['recommendations']
        }
    except Exception as e:
        import traceback
        error_detail = f"{str(e)}\n{traceback.format_exc()}"
        raise HTTPException(status_code=500, detail=error_detail)


@router.get("/mitigation")
async def get_mitigation_recommendations(
    station_id: Optional[str] = None,
    horizon_days: int = 30
):
    """Get risk mitigation recommendations."""
    try:
        # Get predictions and risk scores
        request = PredictionRequest(station_id=station_id, horizon_days=horizon_days)
        response = await predict(request)
        
        # Check if we have predictions
        if not response.predictions or len(response.predictions) == 0:
            raise HTTPException(
                status_code=500,
                detail="No predictions available. Ensure models are loaded and dataset contains data."
            )
        
        recommendations_by_station = {}
        
        for sid, pred_values in response.predictions.items():
            if not pred_values or len(pred_values) == 0:
                continue  # Skip stations with no predictions
            
            current_salinity = pred_values[0] if pred_values else 0.0
            risk_score = response.risk_scores.get(sid, 0.0)
            
            # Generate recommendations
            recommendations = generate_mitigation_recommendations(
                current_salinity=current_salinity,
                forecasted_salinity=pred_values,
                risk_score=risk_score,
                station_id=sid
            )
            
            # Harvest deadline
            harvest_deadline = calculate_harvest_deadline(
                forecasted_salinity=pred_values,
                critical_threshold=4.0
            )
            
            # Safe operational window
            safe_window = find_safe_operational_window(
                forecasted_salinity=pred_values,
                safe_threshold=1.0
            )
            
            recommendations_by_station[sid] = {
                'current_salinity': current_salinity,
                'risk_score': risk_score,
                'recommendations': recommendations,
                'harvest_deadline': harvest_deadline,
                'safe_operational_window': safe_window
            }
        
        return {
            'date': datetime.now().isoformat(),
            'horizon_days': horizon_days,
            'stations': recommendations_by_station
        }
    except Exception as e:
        import traceback
        error_detail = f"{str(e)}\n{traceback.format_exc()}"
        raise HTTPException(status_code=500, detail=error_detail)
