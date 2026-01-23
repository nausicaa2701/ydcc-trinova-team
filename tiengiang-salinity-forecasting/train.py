"""Training script for Tiền Giang salinity forecasting models."""

import os
import sys
import argparse
import torch
import numpy as np
import pandas as pd
from pathlib import Path
import pytorch_lightning as pl
from pytorch_lightning.callbacks import ModelCheckpoint, EarlyStopping
from pytorch_lightning.loggers import CSVLogger
import joblib

sys.path.append(str(Path(__file__).parent))
from utils.data_loader import (
    load_tiengiang_data, prepare_features, prepare_station_data,
    prepare_multi_station_data, split_train_test
)
from utils.models import LSTMModel, GRUModel
from utils.risk_scoring import prepare_risk_features, train_risk_models


def train_lstm(
    data_path: str,
    station_id: str = None,
    seq_length: int = 30,
    horizon: int = 7,
    batch_size: int = 32,
    max_epochs: int = 50,
    output_dir: str = 'models'
):
    """Train LSTM model for short-term forecasting (1-7 days)."""
    print(f"Training LSTM model (horizon={horizon} days)...")
    
    df = load_tiengiang_data(data_path)
    df_features = prepare_features(df)
    
    if station_id:
        X, y, scaler = prepare_station_data(df_features, station_id, seq_length, horizon)
        model_name = f'lstm_{station_id}_h{horizon}'
    else:
        X, y, scalers = prepare_multi_station_data(df_features, seq_length, horizon)
        # Get first available station_id from scalers (instead of hardcoded TG01)
        if len(scalers) == 0:
            raise ValueError("No stations found in dataset!")
        scaler = scalers[list(scalers.keys())[0]]
        model_name = f'lstm_multi_h{horizon}'
    
    X_train, X_val, X_test, y_train, y_val, y_test = split_train_test(X, y)
    
    train_dataset = torch.utils.data.TensorDataset(
        torch.FloatTensor(X_train),
        torch.FloatTensor(y_train)
    )
    val_dataset = torch.utils.data.TensorDataset(
        torch.FloatTensor(X_val),
        torch.FloatTensor(y_val)
    )
    
    train_loader = torch.utils.data.DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = torch.utils.data.DataLoader(val_dataset, batch_size=batch_size) if len(val_dataset) > 0 else None
    
    model = LSTMModel(
        input_size=X_train.shape[2],
        hidden_size=128,
        num_layers=2,
        dropout=0.2,
        horizon=horizon,
        learning_rate=0.001
    )
    
    os.makedirs(output_dir, exist_ok=True)
    
    # Adjust checkpoint monitor based on available data
    if len(val_dataset) > 0:
        checkpoint_callback = ModelCheckpoint(
            dirpath=output_dir,
            filename=f'{model_name}_{{epoch:02d}}_{{val_loss:.4f}}',
            monitor='val_loss',
            mode='min',
            save_top_k=1
        )
        early_stop = EarlyStopping(monitor='val_loss', patience=10, mode='min', check_finite=True)
        callbacks = [checkpoint_callback, early_stop]
    else:
        print("⚠️  Warning: No validation data, using train_loss for checkpointing")
        checkpoint_callback = ModelCheckpoint(
            dirpath=output_dir,
            filename=f'{model_name}_{{epoch:02d}}_{{train_loss:.4f}}',
            monitor='train_loss',
            mode='min',
            save_top_k=1
        )
        callbacks = [checkpoint_callback]
    
    logger = CSVLogger(output_dir, name=model_name)
    
    trainer = pl.Trainer(
        max_epochs=max_epochs,
        callbacks=callbacks,
        logger=logger,
        accelerator='auto',
        devices=1
    )
    
    if val_loader is not None:
        trainer.fit(model, train_loader, val_loader)
    else:
        trainer.fit(model, train_loader)
    
    joblib.dump(scaler, os.path.join(output_dir, f'{model_name}_scaler.pkl'))
    
    print(f"Model saved to {output_dir}/{model_name}")
    return model, scaler


def train_gru(
    data_path: str,
    station_id: str = None,
    seq_length: int = 60,
    horizon: int = 30,
    batch_size: int = 32,
    max_epochs: int = 50,
    output_dir: str = 'models'
):
    """Train GRU model for long-term forecasting (7-30 days)."""
    print(f"Training GRU model (horizon={horizon} days)...")
    
    df = load_tiengiang_data(data_path)
    df_features = prepare_features(df)
    
    # Check available data and adjust parameters if needed
    if station_id:
        station_df = df_features[df_features['station_id'] == station_id]
        available_records = len(station_df)
    else:
        # Get minimum records across all stations
        station_counts = [len(df_features[df_features['station_id'] == sid]) 
                         for sid in df_features['station_id'].unique()]
        if not station_counts:
            print("⚠️  No stations found in dataset! Skipping GRU training...")
            return None, None
        available_records = min(station_counts)
    
    required_records = seq_length + horizon
    
    # Auto-adjust if not enough data
    if available_records < required_records:
        print(f"⚠️  Warning: Only {available_records} records available, but need {required_records} for seq_length={seq_length} + horizon={horizon}")
        # Reduce seq_length and horizon proportionally
        if available_records >= 40:
            # More conservative: ensure at least 10 sequences for proper train/val/test split
            # Target: 10 sequences = available_records - seq_length - horizon + 1
            # So: seq_length + horizon = available_records - 9
            # Use 70% for seq_length, 30% for horizon
            target_sequences = 10
            total_used = available_records - target_sequences + 1
            seq_length = max(20, int(total_used * 0.7))
            horizon = max(7, total_used - seq_length)
            
            # Verify we get at least 10 sequences
            actual_sequences = available_records - seq_length - horizon + 1
            if actual_sequences < 10:
                # Adjust to get exactly 10 sequences
                seq_length = available_records - horizon - 9
                horizon = max(7, horizon)
            
            print(f"   Auto-adjusting to seq_length={seq_length}, horizon={horizon}")
            print(f"   Expected sequences: {available_records - seq_length - horizon + 1} per station")
        else:
            print(f"   ⚠️  Not enough data for GRU training (need at least 40 records). Skipping...")
            return None, None
    
    if station_id:
        X, y, scaler = prepare_station_data(df_features, station_id, seq_length, horizon)
        model_name = f'gru_{station_id}_h{horizon}'
    else:
        X, y, scalers = prepare_multi_station_data(df_features, seq_length, horizon)
        # Get first available station_id from scalers (instead of hardcoded TG01)
        if len(scalers) == 0:
            print("⚠️  No stations found in dataset! Skipping GRU training...")
            return None, None
        scaler = scalers[list(scalers.keys())[0]]
        model_name = f'gru_multi_h{horizon}'
    
    X_train, X_val, X_test, y_train, y_val, y_test = split_train_test(X, y)
    
    train_dataset = torch.utils.data.TensorDataset(
        torch.FloatTensor(X_train),
        torch.FloatTensor(y_train)
    )
    val_dataset = torch.utils.data.TensorDataset(
        torch.FloatTensor(X_val),
        torch.FloatTensor(y_val)
    )
    
    train_loader = torch.utils.data.DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = torch.utils.data.DataLoader(val_dataset, batch_size=batch_size) if len(val_dataset) > 0 else None
    
    model = GRUModel(
        input_size=X_train.shape[2],
        hidden_size=128,
        num_layers=2,
        dropout=0.2,
        horizon=horizon,
        learning_rate=0.001
    )
    
    os.makedirs(output_dir, exist_ok=True)
    
    # Adjust checkpoint monitor based on available data
    if len(val_dataset) > 0:
        checkpoint_callback = ModelCheckpoint(
            dirpath=output_dir,
            filename=f'{model_name}_{{epoch:02d}}_{{val_loss:.4f}}',
            monitor='val_loss',
            mode='min',
            save_top_k=1
        )
        early_stop = EarlyStopping(monitor='val_loss', patience=10, mode='min', check_finite=True)
        callbacks = [checkpoint_callback, early_stop]
    else:
        print("⚠️  Warning: No validation data, using train_loss for checkpointing")
        checkpoint_callback = ModelCheckpoint(
            dirpath=output_dir,
            filename=f'{model_name}_{{epoch:02d}}_{{train_loss:.4f}}',
            monitor='train_loss',
            mode='min',
            save_top_k=1
        )
        callbacks = [checkpoint_callback]
    
    logger = CSVLogger(output_dir, name=model_name)
    
    trainer = pl.Trainer(
        max_epochs=max_epochs,
        callbacks=callbacks,
        logger=logger,
        accelerator='auto',
        devices=1
    )
    
    if val_loader is not None:
        trainer.fit(model, train_loader, val_loader)
    else:
        trainer.fit(model, train_loader)
    
    joblib.dump(scaler, os.path.join(output_dir, f'{model_name}_scaler.pkl'))
    
    print(f"Model saved to {output_dir}/{model_name}")
    return model, scaler


def train_risk_models_wrapper(
    data_path: str,
    output_dir: str = 'models'
):
    """Train risk scoring models."""
    print("Training risk scoring models...")
    
    df = load_tiengiang_data(data_path)
    df_features = prepare_features(df)
    
    X, y = prepare_risk_features(df_features)
    
    models = train_risk_models(X, y)
    
    os.makedirs(output_dir, exist_ok=True)
    
    for name, model_dict in models.items():
        joblib.dump(model_dict, os.path.join(output_dir, f'risk_{name}.pkl'))
        print(f"{name}: Train={model_dict['train_score']:.4f}, Test={model_dict['test_score']:.4f}")
    
    return models


def main():
    parser = argparse.ArgumentParser(description='Train Tiền Giang salinity forecasting models')
    parser.add_argument('--data', type=str, default='../dataset/mekong_delta_salinity_stations.csv',
                       help='Path to dataset CSV')
    parser.add_argument('--model', type=str, choices=['lstm', 'gru', 'risk', 'all'], default='all',
                       help='Model to train')
    parser.add_argument('--station', type=str, default=None,
                       help='Station ID (optional, for single station training)')
    parser.add_argument('--output', type=str, default='models',
                       help='Output directory for models')
    parser.add_argument('--horizon', type=int, default=7,
                       help='Forecast horizon (for LSTM/GRU)')
    parser.add_argument('--epochs', type=int, default=50,
                       help='Max epochs')
    
    args = parser.parse_args()
    
    if args.model in ['lstm', 'all']:
        train_lstm(args.data, args.station, horizon=7, max_epochs=args.epochs, output_dir=args.output)
    
    if args.model in ['gru', 'all']:
        try:
            result = train_gru(args.data, args.station, horizon=30, max_epochs=args.epochs, output_dir=args.output)
            if result is None or result[0] is None:
                print("⚠️  GRU training skipped due to insufficient data")
        except ValueError as e:
            print(f"⚠️  GRU training failed: {e}")
    
    if args.model in ['risk', 'all']:
        train_risk_models_wrapper(args.data, output_dir=args.output)
    
    print("Training complete!")


if __name__ == '__main__':
    main()

