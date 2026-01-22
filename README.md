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
├── tiengiang-salinity-forecasting/  # AI API
│   ├── api/               # FastAPI endpoints
│   ├── utils/             # ML utilities
│   ├── models/            # Trained model files
│   ├── train.py           # Model training script
│   └── requirements.txt
├── dataset/               # Training and reference data
├── scripts/               # Utility scripts
├── extract_station_data_from_pdf.py  # PDF data extraction
└── docker-compose.yml     # Docker setup
```

## Features

### Core Features
- ✅ **Interactive Salinity Map** with real-time boundaries (1‰ and 4‰ thresholds)
- ✅ **Risk Heatmap Visualization** showing salinity risk scores
- ✅ **AI-Powered Forecasting** (7, 14, 30-day horizons)
- ✅ **Farm & Cooperative Management** with role-based views
- ✅ **Decision Support Tools**:
  - Trend Analysis (long-term patterns, seasonal analysis)
  - Storage Planning (reservoir management, optimal fill dates)
  - Risk Mitigation (harvest deadlines, operational windows)
- ✅ **Automated PDF Data Extraction** from forecast reports
- ✅ **Multi-language Support** (English/Vietnamese)

### User Roles
- **SYSTEM_ADMIN**: Full system access, manages all cooperatives
- **COOP_ADMIN**: Manages their cooperative and farmers
- **FARMER**: Views their farm data and recommendations

## Getting Started

### Prerequisites
- **Node.js** 18+ and npm
- **Python** 3.10+
- **Mapbox Access Token** ([Get one here](https://account.mapbox.com/access-tokens/))

### 1. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
echo "VITE_MAPBOX_TOKEN=your_mapbox_token_here" > .env
echo "VITE_API_BASE_URL=http://localhost:8000" >> .env
echo "VITE_AI_API_BASE_URL=http://localhost:8001" >> .env

# Start development server
npm run dev
```

Frontend will be available at `http://localhost:5173`

### 2. Backend Setup

```bash
# Navigate to project root
cd /path/to/ydcc-trinova-team

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt

# Run backend server
./backend/run.sh
# Or manually:
export PYTHONPATH="$(pwd):$PYTHONPATH"
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend will be available at:
- API: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`

### 3. AI API Setup

#### Option 1: Using Script (Recommended)

```bash
cd tiengiang-salinity-forecasting
./run_api.sh
```

#### Option 2: Manual Setup

```bash
cd tiengiang-salinity-forecasting

# Create virtual environment if not exists
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

# Activate venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run server (IMPORTANT: must run from tiengiang-salinity-forecasting directory)
export PYTHONPATH="$(pwd):$PYTHONPATH"
python3 -m uvicorn api.main:app --host 0.0.0.0 --port 8001 --reload
```

AI API will be available at:
- API: `http://localhost:8001`
- API Docs: `http://localhost:8001/docs`
- Health Check: `http://localhost:8001/health`

**Important Notes:**
- Must run from `tiengiang-salinity-forecasting` directory
- Ensure `PYTHONPATH` is set correctly
- If you encounter `ModuleNotFoundError: No module named 'api'`, check your current directory

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

### AI API (Port 8001)

#### Health Check
- `GET /health` - API health status

#### Predictions
- `POST /predict` - Get salinity predictions
  ```json
  {
    "station_id": "TG01",  // optional
    "horizon_days": 7,     // 1-7 for LSTM, 7-30 for GRU
    "date": "2024-01-15"   // optional
  }
  ```

#### Boundaries
- `GET /boundaries?date=2024-01-15` - Get salt intrusion boundaries (1‰ and 4‰) as GeoJSON

#### Risk Scores
- `GET /risk?date=2024-01-15` - Get risk scores for all stations

#### Stations
- `GET /stations` - Get all monitoring stations metadata

#### Decision Support
- `GET /trend?station_id=TG01&start_date=2024-01-01&end_date=2024-01-31` - Trend analysis
- `GET /storage?current_level_percent=68&daily_consumption_m3=1000&total_capacity_m3=50000&horizon_days=30` - Storage planning
- `GET /mitigation?station_id=TG01&horizon_days=30` - Risk mitigation recommendations

## AI Models

### Forecasting Models
- **LSTM** (Short-term: 1-7 days)
  - Architecture: 2-layer LSTM, hidden_size=128
  - Input: 30-day sequence
  - Output: 7-day forecast
  - Use case: High-accuracy short-term predictions

- **GRU** (Long-term: 7-30 days)
  - Architecture: 2-layer GRU, hidden_size=128
  - Input: 60-day sequence
  - Output: 30-day forecast
  - Use case: Efficient long-term predictions

### Risk Scoring Models
- **Logistic Regression**: Baseline, interpretable
- **Random Forest**: Accuracy ~97.6%
- **Gradient Boosting**: Accuracy ~97.9%

## Development

### Running All Services

Start each service in separate terminals:

**Terminal 1 - Backend:**
```bash
./backend/run.sh
```

**Terminal 2 - AI API:**
```bash
cd tiengiang-salinity-forecasting
./run_api.sh
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm run dev
```

### Environment Variables

**Frontend (.env):**
```
VITE_MAPBOX_TOKEN=your_mapbox_token_here
VITE_API_BASE_URL=http://localhost:8000
VITE_AI_API_BASE_URL=http://localhost:8001
```

**Backend:**
- Uses in-memory database by default
- JWT secret key can be configured in `backend/auth.py`

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
