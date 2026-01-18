"""Data loading and preprocessing for Tiền Giang stations."""

import pandas as pd
import numpy as np
from pathlib import Path
from typing import Tuple, List, Optional
from sklearn.preprocessing import StandardScaler, MinMaxScaler


TIEN_GIANG_STATIONS = ['TG01', 'TG02', 'TG03', 'TG04', 'TG05']


def load_tiengiang_data(data_path: str) -> pd.DataFrame:
    """Load and filter data for Tiền Giang stations."""
    df = pd.read_csv(data_path)
    df['date'] = pd.to_datetime(df['date'])
    
    tiengiang_df = df[df['station_id'].isin(TIEN_GIANG_STATIONS)].copy()
    tiengiang_df = tiengiang_df.sort_values(['station_id', 'date']).reset_index(drop=True)
    
    return tiengiang_df


def prepare_features(df: pd.DataFrame) -> pd.DataFrame:
    """Prepare features for model training."""
    feature_cols = [
        'salinity_ppt',
        'discharge_TC_m3s',
        'tide_vungtau_m',
        'rainfall_mm',
        'water_level_m',
        'nino34_anom',
        'salinity_lag_1d',
        'salinity_lag_7d',
        'salinity_lag_14d',
        'discharge_lag_1d',
        'discharge_lag_7d',
        'tide_lag_1d',
        'tide_lag_7d',
        'distance_to_sea_km',
        'elevation_m',
        'month',
        'day_of_year',
    ]
    
    df_features = df[['station_id', 'date'] + feature_cols].copy()
    
    for col in feature_cols:
        if col in df_features.columns:
            df_features[col] = pd.to_numeric(df_features[col], errors='coerce')
    
    df_features = df_features.ffill().bfill().fillna(0)
    
    return df_features


def create_sequences(
    data: np.ndarray,
    target_idx: int,
    seq_length: int,
    horizon: int,
    step: int = 1
) -> Tuple[np.ndarray, np.ndarray]:
    """Create sequences for time series prediction."""
    X, y = [], []
    
    for i in range(0, len(data) - seq_length - horizon + 1, step):
        X.append(data[i:i + seq_length])
        y.append(data[i + seq_length:i + seq_length + horizon, target_idx])
    
    return np.array(X), np.array(y)


def prepare_station_data(
    df: pd.DataFrame,
    station_id: str,
    seq_length: int = 30,
    horizon: int = 7,
    feature_cols: Optional[List[str]] = None
) -> Tuple[np.ndarray, np.ndarray, StandardScaler]:
    """Prepare data for a specific station."""
    if feature_cols is None:
        feature_cols = [
            'salinity_ppt', 'discharge_TC_m3s', 'tide_vungtau_m',
            'rainfall_mm', 'water_level_m', 'nino34_anom',
            'salinity_lag_1d', 'salinity_lag_7d', 'discharge_lag_1d',
            'distance_to_sea_km', 'elevation_m', 'month', 'day_of_year'
        ]
    
    station_df = df[df['station_id'] == station_id].copy()
    station_df = station_df.sort_values('date')
    
    feature_data = station_df[feature_cols].values
    target_idx = feature_cols.index('salinity_ppt')
    
    scaler = StandardScaler()
    scaled_data = scaler.fit_transform(feature_data)
    
    X, y = create_sequences(scaled_data, target_idx, seq_length, horizon)
    
    return X, y, scaler


def prepare_multi_station_data(
    df: pd.DataFrame,
    seq_length: int = 30,
    horizon: int = 7
) -> Tuple[np.ndarray, np.ndarray, dict]:
    """Prepare data for all Tiền Giang stations (spatio-temporal)."""
    feature_cols = [
        'salinity_ppt', 'discharge_TC_m3s', 'tide_vungtau_m',
        'rainfall_mm', 'water_level_m', 'nino34_anom',
        'salinity_lag_1d', 'salinity_lag_7d', 'discharge_lag_1d',
        'distance_to_sea_km', 'elevation_m', 'month', 'day_of_year'
    ]
    
    all_X, all_y = [], []
    scalers = {}
    
    for station_id in TIEN_GIANG_STATIONS:
        station_df = df[df['station_id'] == station_id].copy()
        station_df = station_df.sort_values('date')
        
        feature_data = station_df[feature_cols].values
        target_idx = feature_cols.index('salinity_ppt')
        
        scaler = StandardScaler()
        scaled_data = scaler.fit_transform(feature_data)
        
        X, y = create_sequences(scaled_data, target_idx, seq_length, horizon)
        all_X.append(X)
        all_y.append(y)
        scalers[station_id] = scaler
    
    X_combined = np.concatenate(all_X, axis=0)
    y_combined = np.concatenate(all_y, axis=0)
    
    return X_combined, y_combined, scalers


def split_train_test(
    X: np.ndarray,
    y: np.ndarray,
    test_size: float = 0.2,
    validation_size: float = 0.1
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Split data into train, validation, and test sets."""
    n = len(X)
    n_test = int(n * test_size)
    n_val = int(n * validation_size)
    n_train = n - n_test - n_val
    
    X_train, y_train = X[:n_train], y[:n_train]
    X_val, y_val = X[n_train:n_train + n_val], y[n_train:n_train + n_val]
    X_test, y_test = X[n_train + n_val:], y[n_train + n_val:]
    
    return X_train, X_val, X_test, y_train, y_val, y_test

