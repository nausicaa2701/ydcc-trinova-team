"""Prediction script for Tiền Giang salinity forecasting."""

import os
import sys
import argparse
import torch
import numpy as np
import pandas as pd
from pathlib import Path
import joblib
import json
from datetime import datetime, timedelta

sys.path.append(str(Path(__file__).parent))
from utils.data_loader import load_tiengiang_data, prepare_features, prepare_station_data
from utils.models import LSTMModel, GRUModel
from utils.risk_scoring import calculate_risk_score, predict_risk_class


def load_model(model_path: str, model_type: str = 'lstm'):
    """Load trained model."""
    if model_type == 'lstm':
        model = LSTMModel.load_from_checkpoint(model_path)
    elif model_type == 'gru':
        model = GRUModel.load_from_checkpoint(model_path)
    else:
        raise ValueError(f"Unknown model type: {model_type}")
    
    model.eval()
    return model


def predict_salinity(
    model,
    scaler,
    df: pd.DataFrame,
    station_id: str,
    seq_length: int = 30,
    horizon: int = 7
) -> np.ndarray:
    """Predict salinity for a station."""
    station_df = df[df['station_id'] == station_id].sort_values('date')
    
    feature_cols = [
        'salinity_ppt', 'discharge_TC_m3s', 'tide_vungtau_m',
        'rainfall_mm', 'water_level_m', 'nino34_anom',
        'salinity_lag_1d', 'salinity_lag_7d', 'discharge_lag_1d',
        'distance_to_sea_km', 'elevation_m', 'month', 'day_of_year'
    ]
    
    last_sequence = station_df[feature_cols].tail(seq_length).values
    last_sequence_scaled = scaler.transform(last_sequence)
    
    X = torch.FloatTensor(last_sequence_scaled).unsqueeze(0)
    
    with torch.no_grad():
        y_pred = model(X).numpy()[0]
    
    dummy_features = np.zeros((len(y_pred), len(feature_cols)))
    dummy_features[:, 0] = y_pred
    y_pred_unscaled = scaler.inverse_transform(dummy_features)[:, 0]
    
    return y_pred_unscaled


def generate_boundaries(
    predictions: dict,
    threshold_1ppt: float = 1.0,
    threshold_4ppt: float = 4.0
) -> dict:
    """Generate salinity boundaries for 1‰ and 4‰ thresholds."""
    features = []
    
    for threshold in [threshold_1ppt, threshold_4ppt]:
        stations_above = []
        for station_id, pred in predictions.items():
            if pred >= threshold:
                stations_above.append(station_id)
        
        if len(stations_above) >= 3:
            coords = []
            for station_id in stations_above:
                lat, lon = get_station_coords(station_id)
                coords.append([lon, lat])
            
            features.append({
                'type': 'Feature',
                'geometry': {
                    'type': 'Polygon',
                    'coordinates': [coords + [coords[0]]]
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


def get_station_coords(station_id: str) -> tuple:
    """Get station coordinates."""
    coords = {
        'TG01': (10.36, 106.36),
        'TG02': (10.41, 105.97),
        'TG03': (10.27, 106.74),
        'TG04': (10.28, 106.83),
        'TG05': (10.40, 106.74),
    }
    return coords.get(station_id, (10.0, 106.0))


def main():
    parser = argparse.ArgumentParser(description='Predict Tiền Giang salinity')
    parser.add_argument('--data', type=str, default='../dataset/mekong_delta_salinity_stations.csv',
                       help='Path to dataset CSV')
    parser.add_argument('--model', type=str, required=True,
                       help='Path to model checkpoint')
    parser.add_argument('--scaler', type=str, required=True,
                       help='Path to scaler file')
    parser.add_argument('--model-type', type=str, choices=['lstm', 'gru'], default='lstm',
                       help='Model type')
    parser.add_argument('--station', type=str, default=None,
                       help='Station ID (optional)')
    parser.add_argument('--horizon', type=int, default=7,
                       help='Forecast horizon')
    parser.add_argument('--output', type=str, default='predictions.json',
                       help='Output file')
    
    args = parser.parse_args()
    
    df = load_tiengiang_data(args.data)
    df_features = prepare_features(df)
    
    model = load_model(args.model, args.model_type)
    scaler = joblib.load(args.scaler)
    
    stations = ['TG01', 'TG02', 'TG03', 'TG04', 'TG05'] if args.station is None else [args.station]
    
    predictions = {}
    for station_id in stations:
        pred = predict_salinity(model, scaler, df_features, station_id, horizon=args.horizon)
        predictions[station_id] = pred.tolist()
    
    boundaries = generate_boundaries(
        {sid: pred[0] for sid, pred in predictions.items()}
    )
    
    output = {
        'date': datetime.now().isoformat(),
        'horizon_days': args.horizon,
        'predictions': predictions,
        'boundaries': boundaries
    }
    
    with open(args.output, 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"Predictions saved to {args.output}")


if __name__ == '__main__':
    main()

