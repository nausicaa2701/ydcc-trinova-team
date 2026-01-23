"""Salinity station data extraction API endpoints."""

import sys
import json
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

# Import extraction functions
try:
    from extract_station_data_from_pdf import (
        extract_all_stations_from_pdf,
        clean_missing_data,
        fetch_tphcm_salinity_pdfs
    )
    EXTRACTION_AVAILABLE = True
except ImportError as e:
    EXTRACTION_AVAILABLE = False
    IMPORT_ERROR = str(e)

router = APIRouter(prefix="/api/salinity", tags=["salinity-data"])


class SalinityStationData(BaseModel):
    """Response model for salinity station data."""
    station_name: str
    river_name: Optional[str] = None
    distance_km: Optional[float] = None
    smax_observed: Optional[float] = None
    observed_period: Optional[str] = None
    smax_forecast: Optional[float] = None
    forecast_date: Optional[str] = None
    temperature: Optional[float] = None
    water_level: Optional[float] = None
    ec: Optional[float] = None
    salinity: Optional[float] = None
    do: Optional[float] = None
    source_file: Optional[str] = None
    extraction_method: Optional[str] = None
    extraction_timestamp: Optional[str] = None


@router.get("/latest", response_model=List[SalinityStationData])
async def get_latest_salinity_data(
    force_refresh: bool = False,
    max_missing: int = 5
):
    """
    Get latest salinity station data from PDF extraction.
    
    - **force_refresh**: If True, fetch new PDFs and re-extract. Otherwise, use cached data.
    - **max_missing**: Maximum number of missing required fields allowed (default: 5)
    
    Returns list of station data records.
    """
    if not EXTRACTION_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail=f"Extraction module not available: {IMPORT_ERROR}"
        )
    
    try:
        pdf_dir = Path('ref/paper')
        output_dir = Path('extracted_data')
        output_dir.mkdir(exist_ok=True)
        
        # Check if we should fetch new PDFs
        if force_refresh:
            print(f"Fetching latest salinity PDFs...")
            fetched = fetch_tphcm_salinity_pdfs(pdf_dir, max_articles=3)
            if fetched:
                print(f"Downloaded {len(fetched)} new PDF(s)")
        
        # Find all PDF files
        pdf_files = list(pdf_dir.glob('*.pdf'))
        
        if not pdf_files:
            # Try to return cached data if available
            cached_json = output_dir / 'station_data_extracted.json'
            if cached_json.exists():
                with open(cached_json, 'r', encoding='utf-8') as f:
                    cached_data = json.load(f)
                return cached_data
            
            raise HTTPException(
                status_code=404,
                detail=f"No PDF files found in {pdf_dir}. Use force_refresh=true to fetch new PDFs."
            )
        
        # Extract data from all PDFs
        all_stations_data = []
        for pdf_path in pdf_files:
            try:
                stations_data = extract_all_stations_from_pdf(pdf_path)
                all_stations_data.extend(stations_data)
            except Exception as e:
                print(f"Warning: Failed to extract from {pdf_path.name}: {e}")
                continue
        
        if not all_stations_data:
            # Try cached data
            cached_json = output_dir / 'station_data_extracted.json'
            if cached_json.exists():
                with open(cached_json, 'r', encoding='utf-8') as f:
                    cached_data = json.load(f)
                return cached_data
            
            raise HTTPException(
                status_code=404,
                detail="No data extracted from any PDF. Check PDF files and extraction logic."
            )
        
        # Clean data
        cleaned_data = clean_missing_data(all_stations_data, max_missing=max_missing)
        
        if not cleaned_data:
            raise HTTPException(
                status_code=404,
                detail="No data remaining after cleaning. Try reducing max_missing parameter."
            )
        
        # Save to cache
        json_path = output_dir / 'station_data_extracted.json'
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(cleaned_data, f, ensure_ascii=False, indent=2)
        
        return cleaned_data
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error extracting salinity data: {str(e)}"
        )


@router.get("/stations", response_model=List[str])
async def list_stations():
    """Get list of unique station names from latest data."""
    try:
        data = await get_latest_salinity_data(force_refresh=False)
        stations = list(set(record.get('station_name') for record in data if record.get('station_name')))
        return sorted(stations)
    except HTTPException:
        return []


@router.get("/stations/{station_name}", response_model=List[SalinityStationData])
async def get_station_data(station_name: str):
    """Get data for a specific station."""
    try:
        data = await get_latest_salinity_data(force_refresh=False)
        station_data = [
            record for record in data 
            if record.get('station_name', '').lower() == station_name.lower()
        ]
        if not station_data:
            raise HTTPException(
                status_code=404,
                detail=f"Station '{station_name}' not found"
            )
        return station_data
    except HTTPException:
        raise
