# iCoop Mekong 
A comprehensive web application for monitoring and forecasting salt intrusion in the Mekong Delta region, with integrated farm and cooperative management capabilities.

## Tech Stack

**Frontend:** React 18 + TypeScript + Vite, Mapbox GL JS, Zustand, Tailwind CSS, PrimeReact  
**Backend:** FastAPI (Python), PostgreSQL, JWT Authentication  
**AI/ML:** PyTorch Lightning, LSTM/GRU models, Scikit-learn

## Features

### Frontend Features

- **Interactive Salinity Map**
  - Real-time salt intrusion boundaries (1‰ and 4‰ thresholds)
  - Risk heatmap visualization
  - Farm and cooperative markers
  - Responsive design with mobile hamburger menu

- **Role-Based Dashboards**
  - **SYSTEM_ADMIN**: Global map view, HTX management, analytics dashboard
  - **COOP_ADMIN**: Cooperative map view, farmer management, Zalo message management, AI dashboard
  - **FARMER**: Personal dashboard with real-time salinity data, 7/14/30-day forecasts

- **AI Dashboard**
  - Real-time salinity data visualization
  - 7/14/30-day forecast charts with calendar integration
  - Storage planning recommendations
  - Personalized action recommendations based on risk scores

- **Zalo Message Management** (COOP_ADMIN)
  - Daily message history for farmers
  - 7-day salinity predictions per farmer
  - Action plans with priority levels (CRITICAL/HIGH/MEDIUM/LOW)
  - Danger level calculations (low/medium/high/critical)

- **Multi-language Support**: English/Vietnamese

### Backend Features

- **Authentication & Authorization**
  - JWT-based authentication
  - Role-based access control (SYSTEM_ADMIN, COOP_ADMIN, FARMER)
  - Password management

- **Cooperative Management**
  - CRUD operations for cooperatives
  - JSON config management per cooperative
  - Geocoding and reverse geocoding

- **Farmer Management**
  - CRUD operations for farmers
  - Location management with station linking
  - Nearest station suggestions

- **Data Extraction**
  - Automated PDF extraction from forecast reports
  - Salinity station data extraction with OCR support
  - TH2I (HCMC TVHN) data extraction

- **Alert System**
  - Zalo notification configuration
  - Threshold-based alert triggers
  - Test notification endpoints

### AI Features

- **Salinity Forecasting**
  - **LSTM Model**: Short-term predictions (1-7 days)
  - **GRU Model**: Long-term predictions (7-30 days)
  - Real-time predictions at 30-minute intervals
  - Multi-station support

- **Risk Assessment**
  - Risk score calculation (0-100)
  - Risk level classification (low/medium/high/critical)
  - Station-specific risk analysis

- **Decision Support**
  - **Trend Analysis**: Long-term patterns, seasonal analysis, period comparison
  - **Storage Planning**: Days of supply, optimal fill dates, storage requirements
  - **Risk Mitigation**: Harvest deadlines, safe operational windows, action recommendations

- **Boundary Generation**
  - GeoJSON boundary generation for 1‰ and 4‰ thresholds
  - Date-specific boundary queries

## API Endpoints

### Authentication
- `POST /auth/login` - Login
- `GET /auth/me` - Get current user
- `POST /auth/change-password` - Change password

### Cooperatives
- `GET /coops` - List all cooperatives
- `POST /coops` - Create cooperative
- `GET /coops/{id}` - Get cooperative details
- `PUT /coops/{id}` - Update cooperative
- `DELETE /coops/{id}` - Delete cooperative
- `PUT /coops/{id}/config` - Update config

### Farmers
- `GET /coops/{id}/farmers` - List farmers
- `POST /coops/{id}/farmers` - Create farmer
- `PUT /coops/{id}/farmers/{farmer_id}` - Update farmer
- `DELETE /coops/{id}/farmers/{farmer_id}` - Delete farmer

### Data Extraction
- `GET /api/salinity/latest` - Latest salinity data
- `GET /api/th2i/latest` - Latest TH2I data

### AI Forecasting
- `POST /api/ai/predict` - Salinity predictions (7/14/30 days)
- `GET /api/ai/boundaries` - Salt intrusion boundaries (GeoJSON)
- `GET /api/ai/risk` - Risk scores
- `GET /api/ai/trend` - Trend analysis
- `GET /api/ai/storage` - Storage planning
- `GET /api/ai/mitigation` - Risk mitigation recommendations
- `GET /api/ai/stations` - List monitoring stations

### Recommendations
- `GET /api/recommendations/farmers/{id}` - Personalized farmer recommendations
- `GET /api/recommendations/coops/{id}/farmers` - Cooperative-wide recommendations

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- Mapbox Access Token
- PostgreSQL (optional, uses in-memory SQLite by default)

### Backend Setup

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run backend
export PYTHONPATH="$(pwd):$PYTHONPATH"
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend available at: `http://localhost:8000`  
API Docs: `http://localhost:8000/docs`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
echo "VITE_MAPBOX_TOKEN=your_token_here" > .env
echo "VITE_API_BASE_URL=http://localhost:8000" >> .env

# Start dev server
npm run dev
```

Frontend available at: `http://localhost:5173`

### Default Login
- **Phone**: `0900000001`
- **Password**: `admin123`
- **Role**: SYSTEM_ADMIN

## AI Models

### Model Architecture
- **LSTM**: 2-layer, hidden_size=128, 30-day input sequence → 7-day forecast
- **GRU**: 2-layer, hidden_size=128, 60-day input sequence → 16-30 day forecast
- **Risk Scoring**: Logistic Regression, Random Forest, Gradient Boosting (97.9% accuracy)

### Training
Models should be trained using the dataset (`dataset/station_data_daily.csv`) and saved to `backend/models/`:
- `lstm_multi_h7/` - LSTM model files
- `gru_multi_h30/` - GRU model files
- `*_scaler.pkl` - Feature scalers
- `risk_*.pkl` - Risk scoring models

## Project Structure

```
ydcc-trinova-team/
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── views/         # Page views (admin, coop, farmer)
│   │   ├── contexts/      # Auth, Language contexts
│   │   ├── store/         # Zustand state
│   │   └── utils/         # API utilities
├── backend/               # FastAPI backend
│   ├── routers/           # API routes
│   ├── utils/             # ML utilities
│   ├── models/            # Trained AI models
│   └── main.py            # FastAPI app
├── dataset/               # Training data
└── docker-compose.yml     # Docker setup
```

