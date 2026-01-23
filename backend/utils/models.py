"""Neural network models for salinity forecasting."""

import torch
import torch.nn as nn
import pytorch_lightning as pl
from torch.utils.data import DataLoader, TensorDataset


class LSTMModel(pl.LightningModule):
    """LSTM model for 1-7 days salinity forecasting."""
    
    def __init__(
        self,
        input_size: int,
        hidden_size: int = 128,
        num_layers: int = 2,
        dropout: float = 0.2,
        horizon: int = 7,
        learning_rate: float = 0.001
    ):
        super().__init__()
        self.save_hyperparameters()
        
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.horizon = horizon
        self.learning_rate = learning_rate
        
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            dropout=dropout if num_layers > 1 else 0,
            batch_first=True
        )
        
        self.fc = nn.Sequential(
            nn.Linear(hidden_size, hidden_size // 2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_size // 2, horizon)
        )
        
    def forward(self, x):
        lstm_out, _ = self.lstm(x)
        last_hidden = lstm_out[:, -1, :]
        output = self.fc(last_hidden)
        return output
    
    def training_step(self, batch, batch_idx):
        x, y = batch
        y_hat = self(x)
        loss = nn.MSELoss()(y_hat, y)
        self.log('train_loss', loss)
        return loss
    
    def validation_step(self, batch, batch_idx):
        x, y = batch
        y_hat = self(x)
        loss = nn.MSELoss()(y_hat, y)
        mae = nn.L1Loss()(y_hat, y)
        self.log('val_loss', loss)
        self.log('val_mae', mae)
        return loss
    
    def configure_optimizers(self):
        return torch.optim.Adam(self.parameters(), lr=self.learning_rate)


class GRUModel(pl.LightningModule):
    """GRU model for 7-30 days salinity forecasting."""
    
    def __init__(
        self,
        input_size: int,
        hidden_size: int = 128,
        num_layers: int = 2,
        dropout: float = 0.2,
        horizon: int = 30,
        learning_rate: float = 0.001
    ):
        super().__init__()
        self.save_hyperparameters()
        
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.horizon = horizon
        self.learning_rate = learning_rate
        
        self.gru = nn.GRU(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            dropout=dropout if num_layers > 1 else 0,
            batch_first=True
        )
        
        self.fc = nn.Sequential(
            nn.Linear(hidden_size, hidden_size // 2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_size // 2, horizon)
        )
        
    def forward(self, x):
        gru_out, _ = self.gru(x)
        last_hidden = gru_out[:, -1, :]
        output = self.fc(last_hidden)
        return output
    
    def training_step(self, batch, batch_idx):
        x, y = batch
        y_hat = self(x)
        loss = nn.MSELoss()(y_hat, y)
        self.log('train_loss', loss)
        return loss
    
    def validation_step(self, batch, batch_idx):
        x, y = batch
        y_hat = self(x)
        loss = nn.MSELoss()(y_hat, y)
        mae = nn.L1Loss()(y_hat, y)
        self.log('val_loss', loss)
        self.log('val_mae', mae)
        return loss
    
    def configure_optimizers(self):
        return torch.optim.Adam(self.parameters(), lr=self.learning_rate)


class SpatioTemporalLSTM(pl.LightningModule):
    """Spatio-temporal LSTM for multi-station prediction."""
    
    def __init__(
        self,
        input_size: int,
        num_stations: int = 5,
        hidden_size: int = 128,
        num_layers: int = 2,
        dropout: float = 0.2,
        horizon: int = 7,
        learning_rate: float = 0.001
    ):
        super().__init__()
        self.save_hyperparameters()
        
        self.num_stations = num_stations
        self.hidden_size = hidden_size
        self.horizon = horizon
        
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            dropout=dropout if num_layers > 1 else 0,
            batch_first=True
        )
        
        self.spatial_fc = nn.Sequential(
            nn.Linear(hidden_size * num_stations, hidden_size),
            nn.ReLU(),
            nn.Dropout(dropout)
        )
        
        self.fc = nn.Sequential(
            nn.Linear(hidden_size, hidden_size // 2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_size // 2, horizon)
        )
        
    def forward(self, x):
        batch_size = x.size(0)
        station_features = []
        
        for i in range(self.num_stations):
            station_x = x[:, :, i * (x.size(2) // self.num_stations):(i + 1) * (x.size(2) // self.num_stations)]
            lstm_out, _ = self.lstm(station_x)
            station_features.append(lstm_out[:, -1, :])
        
        combined = torch.cat(station_features, dim=1)
        spatial_out = self.spatial_fc(combined)
        output = self.fc(spatial_out)
        return output
    
    def training_step(self, batch, batch_idx):
        x, y = batch
        y_hat = self(x)
        loss = nn.MSELoss()(y_hat, y)
        self.log('train_loss', loss)
        return loss
    
    def validation_step(self, batch, batch_idx):
        x, y = batch
        y_hat = self(x)
        loss = nn.MSELoss()(y_hat, y)
        mae = nn.L1Loss()(y_hat, y)
        self.log('val_loss', loss)
        self.log('val_mae', mae)
        return loss
    
    def configure_optimizers(self):
        return torch.optim.Adam(self.parameters(), lr=self.hyperparameters['learning_rate'])

