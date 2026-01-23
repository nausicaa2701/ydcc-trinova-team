"""Data loading and preprocessing for Tiền Giang stations."""

import pandas as pd
import numpy as np
from pathlib import Path
from typing import Tuple, List, Optional
from sklearn.preprocessing import StandardScaler, MinMaxScaler


def get_all_stations(data_path: str) -> List[str]:
    """Get all unique station IDs from dataset."""
    df = pd.read_csv(data_path)
    return sorted(df['station_id'].unique().tolist())


def load_tiengiang_data(data_path: str, station_ids: Optional[List[str]] = None) -> pd.DataFrame:
    """Load data for specified stations (or all stations if None)."""
    df = pd.read_csv(data_path)
    df['date'] = pd.to_datetime(df['date'])
    
    if station_ids is not None:
        df = df[df['station_id'].isin(station_ids)].copy()
    
    df = df.sort_values(['station_id', 'date']).reset_index(drop=True)
    
    return df


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
        'discharge_lag_14d',  # Added missing lag
        'tide_lag_1d',
        'tide_lag_7d',
        'tide_lag_14d',  # Added missing lag
        'distance_to_sea_km',
        'elevation_m',
        'month',
        'day_of_year',
    ]
    
    # Only select columns that exist in dataframe
    available_cols = ['station_id', 'date'] + [col for col in feature_cols if col in df.columns]
    df_features = df[available_cols].copy()
    
    # Add missing columns with default values
    for col in feature_cols:
        if col not in df_features.columns:
            if 'lag' in col:
                df_features[col] = 0.0  # Default lag values to 0
            else:
                df_features[col] = 0.0
    
    # Ensure all feature columns are numeric
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
    if len(station_df) == 0:
        raise ValueError(f"Station {station_id} not found in dataset!")
    
    station_df = station_df.sort_values('date')
    
    # Only use features that exist in dataframe
    available_features = [col for col in feature_cols if col in station_df.columns]
    if 'salinity_ppt' not in available_features:
        raise ValueError("salinity_ppt column is required but not found!")
    
    feature_data = station_df[available_features].values
    target_idx = available_features.index('salinity_ppt')
    
    # Check if we have enough data
    if len(feature_data) < seq_length + horizon:
        raise ValueError(f"Not enough data for station {station_id}. Need at least {seq_length + horizon} records, got {len(feature_data)}")
    
    scaler = StandardScaler()
    scaled_data = scaler.fit_transform(feature_data)
    
    X, y = create_sequences(scaled_data, target_idx, seq_length, horizon)
    
    if len(X) == 0:
        raise ValueError(f"No sequences created for station {station_id}. Check seq_length ({seq_length}) and horizon ({horizon})")
    
    return X, y, scaler


def prepare_multi_station_data(
    df: pd.DataFrame,
    seq_length: int = 30,
    horizon: int = 7,
    station_ids: Optional[List[str]] = None
) -> Tuple[np.ndarray, np.ndarray, dict]:
    """Prepare data for all specified stations (spatio-temporal)."""
    feature_cols = [
        'salinity_ppt', 'discharge_TC_m3s', 'tide_vungtau_m',
        'rainfall_mm', 'water_level_m', 'nino34_anom',
        'salinity_lag_1d', 'salinity_lag_7d', 'discharge_lag_1d',
        'distance_to_sea_km', 'elevation_m', 'month', 'day_of_year'
    ]
    
    all_X, all_y = [], []
    scalers = {}
    
    if station_ids is None:
        station_ids = sorted(df['station_id'].unique().tolist())
    
    for station_id in station_ids:
        station_df = df[df['station_id'] == station_id].copy()
        if len(station_df) == 0:
            continue
        station_df = station_df.sort_values('date')
        
        # Only use features that exist in dataframe
        available_features = [col for col in feature_cols if col in station_df.columns]
        if 'salinity_ppt' not in available_features:
            print(f"Warning: Station {station_id} missing salinity_ppt, skipping...")
            continue
        
        # Check if we have enough data
        if len(station_df) < seq_length + horizon:
            print(f"Warning: Station {station_id} has only {len(station_df)} records, need {seq_length + horizon}, skipping...")
            continue
        
        feature_data = station_df[available_features].values
        target_idx = available_features.index('salinity_ppt')
        
        scaler = StandardScaler()
        scaled_data = scaler.fit_transform(feature_data)
        
        X, y = create_sequences(scaled_data, target_idx, seq_length, horizon)
        
        if len(X) == 0:
            print(f"Warning: No sequences created for station {station_id}, skipping...")
            continue
        
        all_X.append(X)
        all_y.append(y)
        scalers[station_id] = scaler
    
    if len(all_X) == 0:
        raise ValueError("No valid sequences created from any station! Check data and parameters.")
    
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
    
    # Ensure we have at least 1 sample for validation and test
    n_test = max(1, int(n * test_size))
    n_val = max(1, int(n * validation_size))
    
    # Adjust if total exceeds n
    if n_test + n_val >= n:
        # Very small dataset: use 1 for test, 1 for val, rest for train
        n_test = 1
        n_val = 1 if n > 2 else 0
        n_train = n - n_test - n_val
    else:
        n_train = n - n_test - n_val
    
    X_train, y_train = X[:n_train], y[:n_train]
    if n_val > 0:
        X_val, y_val = X[n_train:n_train + n_val], y[n_train:n_train + n_val]
    else:
        X_val, y_val = np.array([]), np.array([])
    X_test, y_test = X[n_train + n_val:], y[n_train + n_val:]
    
    return X_train, X_val, X_test, y_train, y_val, y_test

