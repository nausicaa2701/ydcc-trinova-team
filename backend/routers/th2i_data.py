"""TH2I (HCMC TVHN) data extraction API endpoints."""

import sys
import json
from pathlib import Path
from typing import List, Dict, Optional, Any
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

# Import extraction functions
try:
    from extract_th2i_from_pdf import (
        extract_th2i_from_pdf_path,
        fetch_latest_th2i_pdf,
        _pick_local_pdf,
        PDF_DIR
    )
    EXTRACTION_AVAILABLE = True
except ImportError as e:
    EXTRACTION_AVAILABLE = False
    IMPORT_ERROR = str(e)

router = APIRouter(prefix="/api/th2i", tags=["th2i-data"])


class TH2IObservation(BaseModel):
    """TH2I observation data model."""
    date: Optional[str] = None
    station: str
    rain_mm: Optional[float] = None
    water_level_m: Optional[float] = None
    inflow_m3s: Optional[float] = None
    turbine_flow_m3s: Optional[float] = None
    discharge_m3s: Optional[float] = None
    source_file: Optional[str] = None


class TH2ITideMeasured(BaseModel):
    """TH2I tide measured data model."""
    date: Optional[str] = None
    station: str
    peaks: List[Dict[str, Any]]
    source_file: Optional[str] = None


class TH2IDataResponse(BaseModel):
    """Complete TH2I data response."""
    observation: List[TH2IObservation]
    tide_measured: List[TH2ITideMeasured]
    tide_forecast: Dict[str, Any]
    source_file: Optional[str] = None
    extraction_date: Optional[str] = None


@router.get("/latest", response_model=TH2IDataResponse)
async def get_latest_th2i_data(force_refresh: bool = False):
    """
    Get latest TH2I (HCMC TVHN) data from PDF extraction.
    
    - **force_refresh**: If True, fetch new PDF and re-extract. Otherwise, use cached data.
    
    Returns observation, tide measured, and tide forecast data.
    """
    if not EXTRACTION_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail=f"Extraction module not available: {IMPORT_ERROR}"
        )
    
    try:
        output_dir = Path('th2i_output')
        output_dir.mkdir(exist_ok=True)
        
        # Check if we should fetch new PDF
        pdf_path = None
        if force_refresh:
            print(f"Fetching latest TH2I PDF...")
            pdf_path = fetch_latest_th2i_pdf(PDF_DIR)
            if pdf_path:
                print(f"Downloaded new PDF: {pdf_path.name}")
        
        # If no new PDF fetched, try to use cached data first
        if pdf_path is None:
            # Check for cached JSON files
            cached_obs = output_dir / 'th2i_observation.json'
            cached_tide = output_dir / 'th2i_tide_measured.json'
            cached_forecast = output_dir / 'th2i_tide_forecast.json'
            
            if cached_obs.exists() and cached_tide.exists() and cached_forecast.exists():
                with open(cached_obs, 'r', encoding='utf-8') as f:
                    observation = json.load(f)
                with open(cached_tide, 'r', encoding='utf-8') as f:
                    tide_measured = json.load(f)
                with open(cached_forecast, 'r', encoding='utf-8') as f:
                    tide_forecast = json.load(f)
                
                return TH2IDataResponse(
                    observation=observation,
                    tide_measured=tide_measured,
                    tide_forecast=tide_forecast,
                    extraction_date=datetime.now().isoformat()
                )
            
            # Try to find local PDF
            pdf_path = _pick_local_pdf(PDF_DIR)
        
        # If still no PDF, try to fetch
        if pdf_path is None:
            pdf_path = fetch_latest_th2i_pdf(PDF_DIR)
        
        if pdf_path is None or not pdf_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"No TH2I PDF found. Use force_refresh=true to fetch new PDF."
            )
        
        # Extract data from PDF
        extract_output = extract_th2i_from_pdf_path(pdf_path)
        
        # Save to cache
        with open(output_dir / 'th2i_observation.json', 'w', encoding='utf-8') as f:
            json.dump(extract_output.observation, f, ensure_ascii=False, indent=2)
        
        with open(output_dir / 'th2i_tide_measured.json', 'w', encoding='utf-8') as f:
            json.dump(extract_output.tide_measured, f, ensure_ascii=False, indent=2)
        
        with open(output_dir / 'th2i_tide_forecast.json', 'w', encoding='utf-8') as f:
            json.dump(extract_output.tide_forecast, f, ensure_ascii=False, indent=2)
        
        extraction_date = datetime.now().isoformat()
        
        return TH2IDataResponse(
            observation=extract_output.observation,
            tide_measured=extract_output.tide_measured,
            tide_forecast=extract_output.tide_forecast,
            source_file=pdf_path.name,
            extraction_date=extraction_date
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error extracting TH2I data: {str(e)}"
        )


@router.get("/observation", response_model=List[TH2IObservation])
async def get_th2i_observation(force_refresh: bool = False):
    """Get only observation data."""
    data = await get_latest_th2i_data(force_refresh=force_refresh)
    return data.observation


@router.get("/tide-measured", response_model=List[TH2ITideMeasured])
async def get_th2i_tide_measured(force_refresh: bool = False):
    """Get only tide measured data."""
    data = await get_latest_th2i_data(force_refresh=force_refresh)
    return data.tide_measured


@router.get("/tide-forecast", response_model=Dict[str, Any])
async def get_th2i_tide_forecast(force_refresh: bool = False):
    """Get only tide forecast data."""
    data = await get_latest_th2i_data(force_refresh=force_refresh)
    return data.tide_forecast


@router.get("/stations", response_model=List[str])
async def list_th2i_stations():
    """Get list of unique station names from observation data."""
    try:
        data = await get_latest_th2i_data(force_refresh=False)
        stations = list(set(obs.station for obs in data.observation if obs.station))
        return sorted(stations)
    except HTTPException:
        return []
