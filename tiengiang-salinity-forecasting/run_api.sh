#!/bin/bash
# Run FastAPI server for Tiền Giang salinity forecasting

cd "$(dirname "$0")"
python3 -m uvicorn api.main:app --host 0.0.0.0 --port 8001 --reload

