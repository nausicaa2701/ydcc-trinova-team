# Mekong Farm - AI-Driven Salinity Intrusion Management

Hệ thống quản lý và dự báo xâm nhập mặn thông minh cho Đồng bằng Sông Cửu Long, với phân quyền theo vai trò (System Admin, HTX Admin, Farmer).

## 🚀 Quick Start

### Backend Setup

1. **Cài đặt dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Chạy backend server:**
   ```bash
   # Cách 1: Dùng script
   chmod +x backend/run.sh
   ./backend/run.sh

   # Cách 2: Chạy trực tiếp
   python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
   ```

   Backend sẽ chạy tại: `http://localhost:8000`
   - API docs: `http://localhost:8000/docs`
   - Health check: `http://localhost:8000/`

### Frontend Setup

1. **Cài đặt dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Chạy frontend dev server:**
   ```bash
   npm run dev
   ```

   Frontend sẽ chạy tại: `http://localhost:5173`

## 📋 Test Accounts

Xem file [MOCK_DATASET.md](./MOCK_DATASET.md) để biết chi tiết các tài khoản test.

**Quick test:**
- **System Admin**: `0900000001` / `admin123`
- **HTX Admin**: `0900000002` / `coop123`
- **Farmer**: `0900000003` / `farmer123`

## 📁 Project Structure

```
MekongFarm/
├── backend/              # FastAPI backend
│   ├── main.py         # Main FastAPI app
│   ├── auth.py         # JWT authentication
│   ├── database.py     # In-memory database
│   ├── models.py       # Data models
│   └── routers/        # API routes
├── frontend/            # React + TypeScript frontend
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── views/      # Role-based views
│   │   └── contexts/   # Auth context
├── tiengiang-salinity-forecasting/  # AI forecasting module
│   ├── api/            # Forecasting API
│   ├── models/         # Trained ML models
│   └── train.py        # Model training
└── dataset/            # Training datasets
```

## 🔐 Authentication & Roles

- **SYSTEM_ADMIN**: Quản lý toàn hệ thống, HTX
- **COOP_ADMIN**: Quản lý nông dân trong HTX, cấu hình cảnh báo
- **FARMER**: Xem dự báo mặn và rủi ro

## 📚 Documentation

- [Mock Dataset & Test Accounts](./MOCK_DATASET.md)
- [AI Forecasting Module](./tiengiang-salinity-forecasting/README.md)
- [Epic Requirements](./epic_describe.md)
- [Enhancement Requirements](./enhancemen.md)

## 🛠️ Tech Stack

**Backend:**
- FastAPI
- JWT Authentication (python-jose)
- In-memory database (MVP)

**Frontend:**
- React + TypeScript
- Vite
- React Router
- Tailwind CSS
- Mapbox GL JS

**AI/ML:**
- PyTorch Lightning
- LSTM/GRU for time-series forecasting
- Scikit-learn for risk classification

## 📝 License

Copyright © 2024 Mekong Farm Project