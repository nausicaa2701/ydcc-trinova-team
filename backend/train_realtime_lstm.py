"""Training script for real-time salinity LSTM (30-minute resolution).

This script trains a short-term forecasting model on `dataset/station_data_realtime.csv`
using the same feature space as the daily models (ENSO, tide, lags, spatial, etc.),
but at 30-minute time resolution.

It saves:
    - Model checkpoint: backend/models/lstm_realtime_h48.ckpt
    - Scaler:          backend/models/lstm_realtime_scaler.pkl

Run from project root:
    python -m backend.train_realtime_lstm
"""

from pathlib import Path
from typing import List

import joblib
import numpy as np
import pandas as pd
import pytorch_lightning as pl
import torch
from torch.utils.data import DataLoader, TensorDataset

from backend.utils.models import LSTMModel
from backend.utils.realtime_config import (
    REALTIME_STEP_MINUTES,
    REALTIME_SEQ_LENGTH,
    REALTIME_HORIZON_STEPS,
)


PROJECT_ROOT = Path(__file__).parent.parent
DATA_PATH = PROJECT_ROOT / "dataset" / "station_data_realtime.csv"
MODELS_DIR = PROJECT_ROOT / "backend" / "models"


FEATURE_COLS: List[str] = [
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


def load_realtime_data(path: Path) -> pd.DataFrame:
    """Load and sort real-time dataset."""
    df = pd.read_csv(path)
    if "date" not in df.columns or "time" not in df.columns:
        raise ValueError("Expected 'date' and 'time' columns in realtime dataset.")

    df["datetime"] = pd.to_datetime(df["date"] + " " + df["time"])
    df = df.sort_values(["station_id", "datetime"]).reset_index(drop=True)
    return df


def build_sequences_for_station(
    df_station: pd.DataFrame,
) -> tuple[np.ndarray, np.ndarray]:
    """Create (X, y) sequences for a single station."""
    from sklearn.preprocessing import StandardScaler

    # Ensure all feature columns exist
    for col in FEATURE_COLS:
        if col not in df_station.columns:
            df_station[col] = 0.0

    values = df_station[FEATURE_COLS].astype(float).values
    if len(values) < REALTIME_SEQ_LENGTH + REALTIME_HORIZON_STEPS:
        return np.empty((0, REALTIME_SEQ_LENGTH, len(FEATURE_COLS))), np.empty(
            (0, REALTIME_HORIZON_STEPS)
        )

    scaler = StandardScaler()
    scaled = scaler.fit_transform(values)

    X_list, y_list = [], []
    target_idx = FEATURE_COLS.index("salinity_ppt")

    for i in range(0, len(scaled) - REALTIME_SEQ_LENGTH - REALTIME_HORIZON_STEPS + 1):
        window = scaled[i : i + REALTIME_SEQ_LENGTH]
        future = scaled[
            i + REALTIME_SEQ_LENGTH : i + REALTIME_SEQ_LENGTH + REALTIME_HORIZON_STEPS
        ]
        X_list.append(window)
        y_list.append(future[:, target_idx])

    X = np.array(X_list)
    y = np.array(y_list)

    return X, y, scaler


def build_dataset(df: pd.DataFrame) -> tuple[TensorDataset, "StandardScaler"]:
    """Build joint dataset across stations and a global scaler."""
    from sklearn.preprocessing import StandardScaler

    all_X: list[np.ndarray] = []
    all_y: list[np.ndarray] = []

    # We will fit a global scaler on all station data for consistency
    all_feature_rows: list[np.ndarray] = []

    for station_id in sorted(df["station_id"].unique().tolist()):
        df_station = df[df["station_id"] == station_id].copy()
        if len(df_station) < REALTIME_SEQ_LENGTH + REALTIME_HORIZON_STEPS:
            continue
        for col in FEATURE_COLS:
            if col not in df_station.columns:
                df_station[col] = 0.0
        all_feature_rows.append(df_station[FEATURE_COLS].astype(float).values)

    if not all_feature_rows:
        raise ValueError("Not enough data in any station for realtime training.")

    all_features = np.vstack(all_feature_rows)
    scaler = StandardScaler()
    all_features_scaled = scaler.fit_transform(all_features)

    # Apply scaler per station and build sequences
    offset = 0
    for station_id in sorted(df["station_id"].unique().tolist()):
        df_station = df[df["station_id"] == station_id].copy()
        n_rows = len(df_station)
        if n_rows < REALTIME_SEQ_LENGTH + REALTIME_HORIZON_STEPS:
            offset += n_rows
            continue

        station_scaled = all_features_scaled[offset : offset + n_rows]
        offset += n_rows

        X_list, y_list = [], []
        target_idx = FEATURE_COLS.index("salinity_ppt")

        for i in range(
            0, len(station_scaled) - REALTIME_SEQ_LENGTH - REALTIME_HORIZON_STEPS + 1
        ):
            window = station_scaled[i : i + REALTIME_SEQ_LENGTH]
            future = station_scaled[
                i
                + REALTIME_SEQ_LENGTH : i
                + REALTIME_SEQ_LENGTH
                + REALTIME_HORIZON_STEPS
            ]
            X_list.append(window)
            y_list.append(future[:, target_idx])

        if X_list:
            all_X.append(np.array(X_list))
            all_y.append(np.array(y_list))

    if not all_X:
        raise ValueError("No training sequences could be created for realtime model.")

    X = np.concatenate(all_X, axis=0)
    y = np.concatenate(all_y, axis=0)

    X_tensor = torch.tensor(X, dtype=torch.float32)
    y_tensor = torch.tensor(y, dtype=torch.float32)

    dataset = TensorDataset(X_tensor, y_tensor)
    return dataset, scaler


def train_realtime_lstm(
    max_epochs: int = 10,
    batch_size: int = 64,
    learning_rate: float = 1e-3,
) -> None:
    """Train and save the realtime LSTM model."""
    print(f"Loading realtime data from {DATA_PATH} ...")
    df = load_realtime_data(DATA_PATH)

    dataset, scaler = build_dataset(df)
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True)

    input_size = len(FEATURE_COLS)
    model = LSTMModel(
        input_size=input_size,
        hidden_size=128,
        num_layers=2,
        dropout=0.2,
        horizon=REALTIME_HORIZON_STEPS,
        learning_rate=learning_rate,
    )

    trainer = pl.Trainer(
        max_epochs=max_epochs,
        accelerator="auto",
        logger=False,
        enable_checkpointing=True,
    )

    trainer.fit(model, dataloader)

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    ckpt_path = MODELS_DIR / "lstm_realtime_h48.ckpt"
    scaler_path = MODELS_DIR / "lstm_realtime_scaler.pkl"

    trainer.save_checkpoint(str(ckpt_path))
    joblib.dump(scaler, scaler_path)

    print(f"Saved realtime LSTM checkpoint to {ckpt_path}")
    print(f"Saved realtime scaler to {scaler_path}")


if __name__ == "__main__":
    train_realtime_lstm()

