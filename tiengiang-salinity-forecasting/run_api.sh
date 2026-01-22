#!/bin/bash
# Run FastAPI server for Tiền Giang salinity forecasting

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "🚀 Starting Tiền Giang Salinity Forecasting AI API..."
echo "📁 Directory: $SCRIPT_DIR"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "❌ Failed to create virtual environment"
        exit 1
    fi
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

if [ $? -ne 0 ]; then
    echo "❌ Failed to activate virtual environment"
    exit 1
fi

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip --quiet

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Run the server
echo ""
echo "✅ Starting AI API server on http://localhost:8001"
echo "📖 API docs available at http://localhost:8001/docs"
echo "🛑 Press Ctrl+C to stop the server"
echo ""
# Ensure we're in the correct directory
cd "$SCRIPT_DIR"
# Set PYTHONPATH to include current directory
export PYTHONPATH="$SCRIPT_DIR:$PYTHONPATH"
# Run uvicorn from the tiengiang-salinity-forecasting directory
python3 -m uvicorn api.main:app --host 0.0.0.0 --port 8001 --reload

