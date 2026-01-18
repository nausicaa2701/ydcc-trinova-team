# Tiền Giang Salinity Forecasting - Deployment Guide

## Tổng quan

Hệ thống dự đoán xâm nhập mặn cho tỉnh Tiền Giang sử dụng:
- **LSTM**: Dự báo 1-7 ngày (short-term)
- **GRU**: Dự báo 7-30 ngày (long-term)  
- **Risk Scoring**: Logistic Regression + Random Forest/Gradient Boosting

## Cấu trúc Models

```
models/
├── lstm_multi_h7_epoch=XX_val_loss=X.XXXX.ckpt  # LSTM model
├── lstm_multi_h7_scaler.pkl                      # Scaler for LSTM
├── risk_logistic_regression.pkl                  # Risk model (LR)
├── risk_random_forest.pkl                        # Risk model (RF)
└── risk_gradient_boosting.pkl                   # Risk model (GBM)
```

## Training

### Train LSTM (1-7 days)
```bash
python3 train.py --data ../dataset/mekong_delta_salinity_stations.csv --model lstm --epochs 50
```

### Train GRU (7-30 days)
```bash
python3 train.py --data ../dataset/mekong_delta_salinity_stations.csv --model gru --epochs 50
```

### Train Risk Models
```bash
python3 train.py --data ../dataset/mekong_delta_salinity_stations.csv --model risk
```

### Train All Models
```bash
python3 train.py --data ../dataset/mekong_delta_salinity_stations.csv --model all --epochs 50
```

## API Deployment

### Start API Server
```bash
./run_api.sh
# hoặc
python3 -m uvicorn api.main:app --host 0.0.0.0 --port 8000
```

### API Endpoints

#### 1. Health Check
```bash
curl http://localhost:8000/health
```

#### 2. Predict Salinity
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "horizon_days": 7,
    "station_id": "TG01"
  }'
```

#### 3. Get Boundaries (1‰ and 4‰)
```bash
curl http://localhost:8000/boundaries?threshold_1ppt=1.0&threshold_4ppt=4.0
```

#### 4. Get Risk Scores
```bash
curl http://localhost:8000/risk?station_id=TG01
```

## Response Format

### Prediction Response
```json
{
  "date": "2024-01-15T10:00:00",
  "horizon_days": 7,
  "predictions": {
    "TG01": [3.2, 3.5, 3.8, 4.1, 4.3, 4.5, 4.7],
    "TG02": [2.1, 2.3, 2.5, 2.7, 2.9, 3.1, 3.3],
    ...
  },
  "boundaries": {
    "type": "FeatureCollection",
    "features": [...]
  },
  "risk_scores": {
    "TG01": 75.5,
    "TG02": 45.2,
    ...
  },
  "confidence": 0.85
}
```

## Integration với Frontend

Frontend có thể consume API qua:
- `POST /predict` - Lấy predictions
- `GET /boundaries` - Lấy ranh mặn GeoJSON
- `GET /risk` - Lấy risk scores

## Tiền Giang Stations

- **TG01**: MyTho (60km from sea)
- **TG02**: CaiBe (90km from sea)
- **TG03**: Cua_Tieu (20km from sea)
- **TG04**: Cua_Dai (10km from sea)
- **TG05**: ChoGao (35km from sea)

