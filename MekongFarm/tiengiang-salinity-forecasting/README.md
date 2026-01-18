# Tiền Giang Salinity Forecasting Model

Hệ thống dự đoán xâm nhập mặn cho tỉnh Tiền Giang sử dụng AI/ML models theo epic requirements.

## Tổng quan

Hệ thống được thiết kế theo **EPIC 1: AI/ML PREDICTION LAYER** với:
- Dự báo ranh mặn **1‰ và 4‰** theo ngày/tuần
- Horizon tối thiểu **7 ngày**, tối đa **30 ngày**
- Risk score (0-100) phản ánh cường độ + thời gian phơi nhiễm
- API chuẩn hóa cho FE và n8n

## Cấu trúc

```
tiengiang-salinity-forecasting/
├── data/              # Processed data
├── models/            # Trained model files
├── api/               # FastAPI server
│   └── main.py        # API endpoints
├── utils/             # Utilities
│   ├── data_loader.py # Data preprocessing
│   ├── models.py      # LSTM/GRU models
│   └── risk_scoring.py # Risk models
├── train.py           # Training script
├── predict.py         # Prediction script
├── run_api.sh         # API startup script
└── requirements.txt   # Dependencies
```

## Models

### 1. LSTM (Short-term: 1-7 days)
- **Architecture**: 2-layer LSTM, hidden_size=128
- **Input**: 30-day sequence
- **Output**: 7-day forecast
- **Use case**: Dự báo ngắn hạn, độ chính xác cao

### 2. GRU (Long-term: 7-30 days)
- **Architecture**: 2-layer GRU, hidden_size=128
- **Input**: 60-day sequence
- **Output**: 30-day forecast
- **Use case**: Dự báo dài hạn, hiệu quả hơn LSTM

### 3. Risk Scoring
- **Logistic Regression**: Baseline, dễ giải thích
- **Random Forest**: Accuracy ~97.6%
- **Gradient Boosting**: Accuracy ~97.9%
- **Use case**: Phân loại risk level (low/medium/high)

## Tiền Giang Stations

- **TG01**: MyTho (60km from sea, elevation 1.0m)
- **TG02**: CaiBe (90km from sea, elevation 1.2m)
- **TG03**: Cua_Tieu (20km from sea, elevation 0.8m)
- **TG04**: Cua_Dai (10km from sea, elevation 0.7m)
- **TG05**: ChoGao (35km from sea, elevation 0.9m)

## Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Train Models
```bash
# Train all models
python3 train.py --data ../dataset/mekong_delta_salinity_stations.csv --model all --epochs 50

# Train specific model
python3 train.py --model lstm --epochs 50
python3 train.py --model gru --epochs 50
python3 train.py --model risk
```

### 3. Start API Server
```bash
./run_api.sh
# hoặc
python3 -m uvicorn api.main:app --host 0.0.0.0 --port 8000
```

## API Endpoints

### Health Check
```bash
GET /health
```

### Predict Salinity
```bash
POST /predict
Body: {
  "station_id": "TG01",  # optional
  "horizon_days": 7,     # 1-7 for LSTM, 7-30 for GRU
  "date": "2024-01-15"   # optional
}
```

### Get Boundaries (1‰ and 4‰)
```bash
GET /boundaries?threshold_1ppt=1.0&threshold_4ppt=4.0
```

### Get Risk Scores
```bash
GET /risk?station_id=TG01&date=2024-01-15
```

## Response Format

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
    "features": [
      {
        "type": "Feature",
        "geometry": {
          "type": "Polygon",
          "coordinates": [[...]]
        },
        "properties": {
          "salinity": 1.0,
          "confidence": 0.85
        }
      },
      {
        "properties": {
          "salinity": 4.0,
          "confidence": 0.85
        }
      }
    ]
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
- `POST /predict` - Lấy predictions và boundaries
- `GET /boundaries` - Lấy ranh mặn GeoJSON cho map visualization
- `GET /risk` - Lấy risk scores cho risk view

Xem `DEPLOYMENT.md` để biết thêm chi tiết về deployment và integration.

