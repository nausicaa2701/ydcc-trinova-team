# iCoop Mekong - AI-Driven Salinity Intrusion Monitoring System

A comprehensive web application for monitoring and forecasting salt intrusion in the Mekong Delta region, with integrated farm and cooperative management capabilities.

## Overview

This system provides:
- **Real-time salinity monitoring** with AI-powered forecasting (7-30 days horizon)
- **Interactive map visualization** showing salt intrusion boundaries and risk heatmaps
- **Farm and cooperative management** with role-based access control
- **Decision support tools** including trend analysis, storage planning, and risk mitigation recommendations
- **Automated data extraction** from PDF forecast reports

## Tech Stack

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **Mapbox GL JS** for interactive map visualization
- **Zustand** for state management
- **TanStack Query** for data fetching
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Lucide React** for icons

### Backend
- **FastAPI** (Python) - Main API server
- **JWT** authentication with role-based access control
- **SQLite** (in-memory for MVP, can be replaced with PostgreSQL)

### AI API
- **PyTorch** + **PyTorch Lightning** for ML models
- **LSTM/GRU** models for salinity forecasting
- **Scikit-learn** for risk scoring models
- **FastAPI** for AI prediction endpoints

## Project Structure

```
ydcc-trinova-team/
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── views/         # Page views (admin, coop, farmer)
│   │   ├── contexts/      # React contexts (Auth, Language)
│   │   ├── store/         # Zustand state management
│   │   ├── utils/         # API utilities
│   │   └── types/         # TypeScript definitions
│   └── package.json
├── backend/               # FastAPI backend
│   ├── routers/           # API route handlers
│   ├── models.py          # Data models
│   ├── database.py        # Database initialization
│   ├── auth.py            # Authentication logic
│   └── requirements.txt
├── backend/               # FastAPI backend (includes AI API)
│   ├── routers/           # API route handlers (including ai_forecast.py)
│   ├── utils/              # ML utilities (migrated from tiengiang-salinity-forecasting)
│   ├── models/             # Trained model files
│   └── requirements.txt
├── dataset/               # Training and reference data
├── scripts/               # Utility scripts
├── extract_station_data_from_pdf.py  # PDF data extraction
└── docker-compose.yml     # Docker setup
```

## Features

### Core Features
-  **Interactive Salinity Map** with real-time boundaries (1‰ and 4‰ thresholds)
-  **Risk Heatmap Visualization** showing salinity risk scores
-  **AI-Powered Forecasting** (7, 14, 30-day horizons)
-  **Farm & Cooperative Management** with role-based views
-  **Decision Support Tools**:
  - Trend Analysis (long-term patterns, seasonal analysis)
  - Storage Planning (reservoir management, optimal fill dates)
  - Risk Mitigation (harvest deadlines, operational windows)
-  **Automated PDF Data Extraction** from forecast reports
-  **Multi-language Support** (English/Vietnamese)

### User Roles
- **SYSTEM_ADMIN**: Full system access, manages all cooperatives
- **COOP_ADMIN**: Manages their cooperative and farmers
- **FARMER**: Views their farm data and recommendations

## Getting Started

### Prerequisites
- **Node.js** 18+ and npm
- **Python** 3.10+
- **Mapbox Access Token** ([Get one here](https://account.mapbox.com/access-tokens/))

### Running All Services

**Important:** You need to run **two separate services** in **two different terminal windows**:

1. **Terminal 1**: Main Backend API (Port 8000) - Includes all APIs (auth, PDF extraction, AI forecasting) - See [Backend API Setup](#2-backend-api-setup-port-8000)
2. **Terminal 2**: Frontend (Port 5173) - See [Frontend Setup](#1-frontend-setup)

Each service must be running for the application to work properly.

### 1. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
echo "VITE_MAPBOX_TOKEN=your_mapbox_token_here" > .env
echo "VITE_API_BASE_URL=http://localhost:8000" >> .env
# AI API is now integrated into main backend (port 8000)
# No need to set VITE_AI_API_BASE_URL separately

# Start development server
npm run dev
```

Frontend will be available at `http://localhost:5173`

### 2. Backend API Setup (Port 8000)

The main backend API handles authentication, cooperatives, farmers, and alerts.

```bash
# Navigate to project root
cd /path/to/ydcc-trinova-team

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt

# Run backend server
export PYTHONPATH="$(pwd):$PYTHONPATH"
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

**Or use the provided script:**
```bash
./backend/run.sh
```

Backend will be available at:
- API: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`

### 3. AI API Setup (Port 8001)

The AI API handles salinity forecasting, risk scoring, and decision support.

```bash
# Navigate to AI API directory
cd tiengiang-salinity-forecasting

# Create virtual environment if not exists
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run server (IMPORTANT: must run from tiengiang-salinity-forecasting directory)
export PYTHONPATH="$(pwd):$PYTHONPATH"
python3 -m uvicorn api.main:app --host 0.0.0.0 --port 8001 --reload
```

**Or use the provided script:**
```bash
cd tiengiang-salinity-forecasting
./run_api.sh
```

AI API will be available at:
- API: `http://localhost:8001`
- API Docs: `http://localhost:8001/docs`
- Health Check: `http://localhost:8001/health`

**Important Notes:**
- Must run from `tiengiang-salinity-forecasting` directory
- Ensure `PYTHONPATH` is set correctly
- If you encounter `ModuleNotFoundError: No module named 'api'`, check your current directory
- Ensure trained models exist in `models/` directory. If missing, train them first (see Training Models section)

### 4. Default Admin Account

After starting the backend, you can log in with:
- **Phone**: `0900000001`
- **Password**: `admin123`
- **Role**: SYSTEM_ADMIN

## PDF Data Extraction Setup

The system includes automated PDF extraction from forecast reports. The script `extract_station_data_from_pdf.py` supports OCR for image-based PDFs.

### Installation

#### 1. Install Python Packages

```bash
pip3 install pdf2image pytesseract Pillow
```

Or using requirements.txt:
```bash
pip install -r requirements.txt
```

#### 2. Install Tesseract OCR

**macOS:**
```bash
brew install tesseract
brew install tesseract-lang  # For Vietnamese language support
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install tesseract-ocr
sudo apt-get install tesseract-ocr-vie  # Vietnamese language pack
```

**Windows:**
- Download installer from: https://github.com/UB-Mannheim/tesseract/wiki
- Install and add to PATH
- Download Vietnamese language pack: https://github.com/tesseract-ocr/tessdata

#### 3. Configure Tesseract Path (if needed)

If Tesseract is not found automatically, set the path in the script:

```python
import pytesseract
pytesseract.pytesseract.tesseract_cmd = r'/usr/local/bin/tesseract'  # macOS
# or
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'  # Windows
```

### Usage

```bash
python extract_station_data_from_pdf.py
```

The script will:
1. Automatically fetch the latest PDF forecast report from the source website
2. Extract station data (name, river, distance, salinity values, forecast dates)
3. Use OCR if the PDF is image-based
4. Clean data (remove records with missing critical values)
5. Export to JSON and CSV formats

**Output files:**
- `extracted_data/station_data_extracted.json`
- `extracted_data/station_data_extracted.csv`

### Troubleshooting

**Error: "TesseractNotFoundError"**
- Ensure Tesseract is installed
- Check PATH or set `pytesseract.pytesseract.tesseract_cmd`

**Error: "pdf2image.exceptions.PDFInfoNotInstalledError"**
- Install poppler:
  - macOS: `brew install poppler`
  - Linux: `sudo apt-get install poppler-utils`
  - Windows: Download from https://github.com/oschwartz10612/poppler-windows/releases

**OCR is slow:**
- Reduce DPI (e.g., dpi=200 instead of 300)
- Only OCR necessary pages

## API Endpoints

### Backend API (Port 8000)

#### Authentication
- `POST /auth/login` - Login with phone and password
- `GET /auth/me` - Get current user profile
- `POST /auth/change-password` - Change password

#### Cooperatives (HTX)
- `GET /coops` - List all cooperatives (SYSTEM_ADMIN only)
- `POST /coops` - Create new cooperative
- `GET /coops/{id}` - Get cooperative details
- `PUT /coops/{id}` - Update cooperative
- `DELETE /coops/{id}` - Deactivate cooperative

#### Farmers
- `GET /coops/{id}/farmers` - List farmers in cooperative (COOP_ADMIN only)
- `POST /coops/{id}/farmers` - Add farmer
- `PUT /coops/{id}/farmers/{farmer_id}` - Update farmer
- `DELETE /coops/{id}/farmers/{farmer_id}` - Remove farmer

#### Alerts
- `GET /coops/{id}/alerts/config` - Get alert configuration
- `PUT /coops/{id}/alerts/config` - Update alert configuration
- `POST /coops/{id}/alerts/test` - Test alert notification

### AI API (Integrated - Port 8000)

All AI endpoints are prefixed with `/api/ai/`:

#### Health Check
- `GET /api/ai/health` - API health status

#### Predictions
- `POST /api/ai/predict` - Get salinity predictions
  ```json
  {
    "station_id": "TG01",  // optional
    "horizon_days": 7,     // 1-7 for LSTM, 7-30 for GRU
    "date": "2024-01-15"   // optional
  }
  ```

#### Boundaries
- `GET /api/ai/boundaries?date=2024-01-15` - Get salt intrusion boundaries (1‰ and 4‰) as GeoJSON

#### Risk Scores
- `GET /api/ai/risk?date=2024-01-15` - Get risk scores for all stations

#### Stations
- `GET /api/ai/stations` - Get all monitoring stations metadata

#### Decision Support
- `GET /api/ai/trend?station_id=TG01&days=30` - Trend analysis
- `GET /api/ai/storage?current_level_percent=68&daily_consumption_m3=1000&total_capacity_m3=50000&horizon_days=30` - Storage planning
- `GET /api/ai/mitigation?station_id=TG01&horizon_days=30` - Risk mitigation recommendations

## AI Models

### Training Models

Before using the AI API, you need to train the models using the real dataset:

```bash
# If training script still exists in tiengiang-salinity-forecasting:
cd tiengiang-salinity-forecasting  # If folder still exists
source venv/bin/activate

# Train all models (LSTM, GRU, Risk)
python3 train.py --data ../dataset/station_data_daily.csv --model all --epochs 50

# Or train specific models
python3 train.py --data ../dataset/station_data_daily.csv --model lstm --epochs 50
python3 train.py --data ../dataset/station_data_daily.csv --model gru --epochs 50
python3 train.py --data ../dataset/station_data_daily.csv --model risk

# After training, copy models to backend/models/
cp models/*.ckpt ../backend/models/
cp models/*.pkl ../backend/models/
```

**Trained models should be in:**
- `backend/models/lstm_multi_h7_*.ckpt`
- `backend/models/gru_multi_h16_*.ckpt`
- `backend/models/risk_*.pkl`

### Forecasting Models
- **LSTM** (Short-term: 1-7 days)
  - Architecture: 2-layer LSTM, hidden_size=128
  - Input: 30-day sequence
  - Output: 7-day forecast
  - Use case: High-accuracy short-term predictions
  - Model file: `models/lstm_multi_h7_*.ckpt`

- **GRU** (Long-term: 7-30 days)
  - Architecture: 2-layer GRU, hidden_size=128
  - Input: 60-day sequence (auto-adjusted to available data)
  - Output: 16-30 day forecast (depends on data availability)
  - Use case: Efficient long-term predictions
  - Model file: `models/gru_multi_h16_*.ckpt` or `models/gru_multi_h30_*.ckpt`

### Risk Scoring Models
- **Logistic Regression**: Baseline, interpretable
- **Random Forest**: Accuracy ~97.6%
- **Gradient Boosting**: Accuracy ~97.9%
- Model files: `models/risk_*.pkl`

### Dataset

The models are trained on real data extracted from PDF reports:
- **Dataset**: `dataset/station_data_daily.csv` (244 daily records)
- **Stations**: HCM01 (Nhà Bè), HCM02 (Cát Lái), HCM03 (Lý Nhơn), HCM04 (Long Đại)
- **Date Range**: 2024-01-11 to 2026-01-20

## Development

### Running Services

The system consists of three separate services that need to be running simultaneously. Start each service in a **separate terminal window**.

#### Terminal 1: Main Backend API (Port 8000)

This handles authentication, cooperatives, farmers, and alerts management.

```bash
# Navigate to project root
cd /path/to/ydcc-trinova-team

# Create and activate virtual environment (if not exists)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt

# Run backend server
export PYTHONPATH="$(pwd):$PYTHONPATH"
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

**Or use the provided script:**
```bash
./backend/run.sh
```

**Backend API will be available at:**
- API: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`

#### Terminal 2: AI API Server (Port 8001)

This handles salinity forecasting, risk scoring, and decision support endpoints.

```bash
# Navigate to AI API directory
cd tiengiang-salinity-forecasting

# Create and activate virtual environment (if not exists)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run AI API server
# IMPORTANT: Must run from tiengiang-salinity-forecasting directory
export PYTHONPATH="$(pwd):$PYTHONPATH"
python3 -m uvicorn api.main:app --host 0.0.0.0 --port 8001 --reload
```

**Or use the provided script:**
```bash
cd tiengiang-salinity-forecasting
./run_api.sh
```

**AI API will be available at:**
- API: `http://localhost:8001`
- API Docs: `http://localhost:8001/docs`
- Health Check: `http://localhost:8001/health`

**Note:** Ensure trained models exist in `tiengiang-salinity-forecasting/models/` directory. If models are missing, train them first:
```bash
cd tiengiang-salinity-forecasting
source venv/bin/activate
python3 train.py --data ../dataset/station_data_daily.csv --model all --epochs 50
```

#### Terminal 3: Frontend (Port 5173)

The React frontend application.

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (first time only)
npm install

# Create .env file if not exists
cat > .env << EOF
VITE_MAPBOX_TOKEN=your_mapbox_token_here
VITE_API_BASE_URL=http://localhost:8000
# AI API is integrated into main backend (port 8000)
# No separate VITE_AI_API_BASE_URL needed
EOF

# Start development server
npm run dev
```

**Frontend will be available at:**
- Application: `http://localhost:5173`

### Service URLs Summary

| Service | Port | URL | Docs |
|---------|------|-----|------|
| Main Backend API (includes AI) | 8000 | http://localhost:8000 | http://localhost:8000/docs |
| Frontend | 5173 | http://localhost:5173 | - |

### Quick Test Commands

**Test Main Backend API:**
```bash
curl http://localhost:8000/
curl http://localhost:8000/docs
```

**Test AI API:**
```bash
curl http://localhost:8000/api/ai/health
curl http://localhost:8000/api/ai/stations
curl -X POST http://localhost:8000/api/ai/predict -H "Content-Type: application/json" -d '{"horizon_days": 7}'
```

**Test Frontend:**
Open browser and navigate to `http://localhost:5173`

### Environment Variables

**Frontend (.env):**
```bash
VITE_MAPBOX_TOKEN=your_mapbox_token_here
VITE_API_BASE_URL=http://localhost:8000
# AI API is integrated into main backend (port 8000)
# No separate VITE_AI_API_BASE_URL needed
```

**Backend:**
- Uses in-memory database by default
- JWT secret key can be configured in `backend/auth.py`

**AI API:**
- Automatically loads models from `backend/models/`
- Uses dataset from `dataset/station_data_daily.csv` (falls back to mock dataset if not found)

### Troubleshooting Services

**Port already in use:**
```bash
# Check which process is using the port
lsof -i :8000  # Main Backend
# AI API is on port 8000 (same as main backend)
lsof -i :5173  # Frontend

# Kill the process if needed
kill -9 <PID>
```

**Backend API not responding:**
- Ensure virtual environment is activated
- Check that `PYTHONPATH` is set correctly
- Verify dependencies are installed: `pip install -r backend/requirements.txt`

**AI API not loading models:**
- Ensure models exist in `backend/models/`
- Train models if missing: `python3 train.py --data ../dataset/station_data_daily.csv --model all`
- Check dataset path: `dataset/station_data_daily.csv`

**Frontend connection errors:**
- Verify backend service is running (port 8000) - includes all APIs
- Check `.env` file has correct API URLs
- Check browser console for detailed error messages

## Docker Deployment

```bash
# Build and run all services
docker-compose up -d

# View logs
docker-compose logs -f frontend
docker-compose logs -f backend

# Stop services
docker-compose down
```

## Data Sources

- **HTX.md**: List of cooperatives in Ho Chi Minh City (used for initial data population)
- **Dataset/**: Training data for AI models
- **PDF Reports**: Automated extraction from forecast websites

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

[Your License Here]

## Support

For issues and questions, please open an issue on GitHub.
