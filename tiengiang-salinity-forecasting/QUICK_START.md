# Quick Start Guide - Tiền Giang Salinity Forecasting

## Tóm tắt

Hệ thống đã được build hoàn chỉnh với:
- ✅ LSTM model (1-7 days forecasting)
- ✅ GRU model (7-30 days forecasting)  
- ✅ Risk scoring models (Logistic Regression, Random Forest, Gradient Boosting)
- ✅ FastAPI server

## Chạy API Server

```bash
cd tiengiang-salinity-forecasting
./run_api.sh
```

API sẽ chạy tại: `http://localhost:8000`

## Test API

### 1. Health Check
```bash
curl http://localhost:8000/health
```

### 2. Predict Salinity (7 days)
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "horizon_days": 7,
    "station_id": "TG01"
  }'
```

### 3. Get Boundaries
```bash
curl http://localhost:8000/boundaries
```

### 4. Get Risk Scores
```bash
curl http://localhost:8000/risk?station_id=TG01
```

## Models Location

```
models/
├── lstm_multi_h7_epoch=01_val_loss=0.0676.ckpt  # LSTM (2.5MB)
├── lstm_multi_h7_scaler.pkl                     # LSTM scaler
├── gru_multi_h30_epoch=XX_val_loss=X.XXXX.ckpt  # GRU
├── gru_multi_h30_scaler.pkl                     # GRU scaler
├── risk_logistic_regression.pkl                 # Risk LR
├── risk_random_forest.pkl                        # Risk RF (4.2MB)
└── risk_gradient_boosting.pkl                    # Risk GBM (1.2MB)
```

## Frontend Integration

Frontend có thể consume API qua:

```typescript
// Example: Fetch predictions
const response = await fetch('http://localhost:8000/predict', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    horizon_days: 7,
    station_id: 'TG01' // optional
  })
});

const data = await response.json();
// data.predictions: { TG01: [3.2, 3.5, ...], ... }
// data.boundaries: GeoJSON FeatureCollection
// data.risk_scores: { TG01: 75.5, ... }
```

## Notes

- Models đã được train với dataset từ 2010-2024
- LSTM: val_loss = 0.0676 (tốt cho 7-day forecast)
- Risk models: Accuracy >97%
- API tự động chọn LSTM (1-7 days) hoặc GRU (7-30 days) dựa trên `horizon_days`

