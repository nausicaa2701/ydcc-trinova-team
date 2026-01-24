#!/usr/bin/env python3
"""
Generate daily records from 10-day period data in station_data_extracted.json
Mỗi period (10 ngày) sẽ được expand thành 10 daily records với interpolation
"""

import json
import re
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from collections import defaultdict

# Import functions from derive_features_from_existing_data.py
import sys
import importlib.util

def load_module(module_path: str, module_name: str):
    """Load a Python module from file path."""
    spec = importlib.util.spec_from_file_location(module_name, module_path)
    if spec is None or spec.loader is None:
        return None
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module

# Load derive_features module
derive_module = load_module('derive_features_from_existing_data.py', 'derive_features')

# Station metadata
STATION_METADATA = {
    "Lý Nhơn": {
        "station_id": "HCM03",
        "distance_to_sea_km": 7.0,
        "elevation_m": 0.3,
    },
    "Nhà Bè": {
        "station_id": "HCM01",
        "distance_to_sea_km": 38.0,
        "elevation_m": 0.5,
    },
    "Cát Lái": {
        "station_id": "HCM02",
        "distance_to_sea_km": 58.0,
        "elevation_m": 0.8,
    },
    "Long Đại": {
        "station_id": "HCM04",
        "distance_to_sea_km": 80.0,
        "elevation_m": 1.0,
    },
}

def parse_period_dates(period_str: str, source_file: str) -> Optional[tuple]:
    """
    Parse start and end dates from period string like "Smax thực đo từ 11/01 - 20/01 (‰)"
    Returns (start_date, end_date) or None
    """
    # Extract dates from period string: "11/01 - 20/01"
    match = re.search(r'(\d{1,2})/(\d{1,2})\s*-\s*(\d{1,2})/(\d{1,2})', period_str)
    if not match:
        return None
    
    start_day = int(match.group(1))
    start_month = int(match.group(2))
    end_day = int(match.group(3))
    end_month = int(match.group(4))
    
    # Extract year from source_file: HOCM_XMAN_20240120_1530.pdf
    year_match = re.search(r'(\d{8})', source_file)
    if year_match:
        date_str = year_match.group(1)
        year = int(date_str[:4])
    else:
        # Fallback: use current year
        year = datetime.now().year
    
    try:
        start_date = datetime(year, start_month, start_day)
        end_date = datetime(year, end_month, end_day)
        
        # Handle year rollover (e.g., 20/12 - 05/01)
        if end_date < start_date:
            end_date = datetime(year + 1, end_month, end_day)
        
        return (start_date, end_date)
    except ValueError:
        return None

def interpolate_daily_salinity(smax: float, day_in_period: int, period_length: int = 10, 
                               trend: str = "increasing") -> float:
    """
    Interpolate daily salinity from smax_observed.
    
    Args:
        smax: Maximum salinity in period
        day_in_period: Day number (0-9 for 10-day period)
        period_length: Length of period (default 10)
        trend: "increasing", "decreasing", or "stable"
    
    Returns:
        Estimated daily salinity
    """
    if smax <= 0:
        return 0.0
    
    # Normalize day to 0-1
    t = day_in_period / max(period_length - 1, 1)
    
    if trend == "increasing":
        # Salinity increases over period (typical for dry season)
        factor = 0.65 + 0.35 * t  # 65% to 100% of max
    elif trend == "decreasing":
        # Salinity decreases (rare, but possible after rain)
        factor = 1.0 - 0.35 * t  # 100% to 65% of max
    else:  # stable
        # Relatively stable with small variation
        factor = 0.75 + 0.25 * np.sin(t * np.pi)  # 75% ± 25% variation
    
    # Add small random variation (±5%)
    variation = np.random.uniform(-0.05, 0.05)
    factor = np.clip(factor + variation, 0.5, 1.0)
    
    return smax * factor

def get_tide_for_date(date: datetime, tide_data: Dict) -> float:
    """Get tide value for a specific date from TH2I tide data."""
    # Try to find tide data for this date
    date_str = date.strftime('%Y-%m-%d')
    
    # Look for Vũng Tàu station (most important)
    for station, records in tide_data.items():
        if 'Vũng Tàu' in station:
            for record in records:
                # Check if date matches (approximate)
                # Use average of high tides
                if 'high_tides' in record and record['high_tides']:
                    avg_tide = np.mean([t.get('level_m', 0) for t in record['high_tides'] if t.get('level_m')])
                    if avg_tide > 0:
                        return avg_tide
    
    # Fallback: use seasonal average
    month = date.month
    if month in [1, 2, 3, 4]:  # Dry season
        return 3.5
    else:  # Wet season
        return 3.0

def get_observation_for_date(date: datetime, station_name: str, observation_data: List[Dict]) -> Dict:
    """Get observation data for a specific date and station."""
    # Find closest observation record
    best_match = None
    min_diff = float('inf')
    
    for obs in observation_data:
        obs_station = obs.get('station', '')
        if station_name not in obs_station and obs_station not in station_name:
            continue
        
        source_file = obs.get('source_file', '')
        # Extract date from source_file
        match = re.search(r'(\d{8})', source_file)
        if match:
            obs_date = datetime.strptime(match.group(1), '%Y%m%d')
            diff = abs((date - obs_date).days)
            if diff < min_diff:
                min_diff = diff
                best_match = obs
    
    if best_match and min_diff <= 5:  # Within 5 days
        return best_match
    
    return {}

def generate_daily_records_from_periods(
    station_data_path: str = "dataset/station_data_extracted.json",
    th2i_observation_path: str = "dataset/th2i_observation.json",
    th2i_tide_path: str = "dataset/th2i_tide_measured.json",
    output_path: str = "dataset/station_data_daily.json"
) -> pd.DataFrame:
    """
    Generate daily records from 10-day period data.
    
    Args:
        station_data_path: Path to station_data_extracted.json
        th2i_observation_path: Path to TH2I observation data
        th2i_tide_path: Path to TH2I tide data
        output_path: Output path for daily records
    
    Returns:
        DataFrame with daily records
    """
    print("=" * 80)
    print("GENERATE DAILY RECORDS FROM PERIOD DATA")
    print("=" * 80)
    print()
    
    # Load data
    print("Loading data...")
    with open(station_data_path, 'r', encoding='utf-8') as f:
        period_data = json.load(f)
    
    with open(th2i_observation_path, 'r', encoding='utf-8') as f:
        th2i_obs = json.load(f)
        observation_data = th2i_obs.get('records', [])
    
    with open(th2i_tide_path, 'r', encoding='utf-8') as f:
        th2i_tide = json.load(f)
        tide_data = defaultdict(list)
        for record in th2i_tide.get('records', []):
            station = record.get('station', '')
            tide_data[station].append(record)
    
    print(f"   Loaded {len(period_data)} period records")
    print(f"   Loaded {len(observation_data)} TH2I observation records")
    print(f"   Loaded {len(tide_data)} tide stations")
    print()
    
    # Generate daily records
    all_daily_records = []
    
    print("Generating daily records from periods...")
    for i, period_record in enumerate(period_data, 1):
        station_name = period_record.get('station_name')
        if station_name not in STATION_METADATA:
            continue
        
        metadata = STATION_METADATA[station_name]
        period_str = period_record.get('observed_period', '')
        source_file = period_record.get('source_file', '')
        smax = period_record.get('smax_observed', 0) or 0
        smax_forecast = period_record.get('smax_forecast', 0) or 0
        
        # Parse period dates
        dates = parse_period_dates(period_str, source_file)
        if not dates:
            print(f"  [{i}/{len(period_data)}] ⚠️  Could not parse period: {period_str}")
            continue
        
        start_date, end_date = dates
        period_length = (end_date - start_date).days + 1
        
        print(f"  [{i}/{len(period_data)}] {station_name}: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')} (smax={smax:.1f})")
        
        # Determine trend (typically increasing in dry season)
        month = start_date.month
        if month in [1, 2, 3, 4, 12]:  # Dry season
            trend = "increasing"
        else:
            trend = "stable"
        
        # Generate daily records for this period
        current_date = start_date
        day_in_period = 0
        
        while current_date <= end_date:
            # Interpolate daily salinity
            daily_salinity = interpolate_daily_salinity(smax, day_in_period, period_length, trend)
            
            # Get observation data for this date
            obs = get_observation_for_date(current_date, station_name, observation_data)
            
            # Get tide data
            tide_vungtau = get_tide_for_date(current_date, tide_data)
            
            # Build daily record
            daily_record = {
                'station_id': metadata['station_id'],
                'station_name': station_name,
                'date': current_date.strftime('%Y-%m-%d'),
                'year': current_date.year,
                'month': current_date.month,
                'day_of_year': current_date.timetuple().tm_yday,
                'salinity_ppt': round(daily_salinity, 2),
                'smax_observed': smax,
                'smax_forecast': smax_forecast,
                'discharge_TC_m3s': obs.get('inflow_m3s') or obs.get('discharge_m3s') or 0.0,
                'tide_vungtau_m': round(tide_vungtau, 3),
                'rainfall_mm': obs.get('rain_mm', 0) or 0.0,
                'water_level_m': obs.get('water_level_m', 0) or 0.0,
                'distance_to_sea_km': metadata['distance_to_sea_km'],
                'elevation_m': metadata['elevation_m'],
                'river_name': period_record.get('river_name', ''),
                'source_file': source_file,
                'original_period': period_str,
                'day_in_period': day_in_period + 1,
            }
            
            all_daily_records.append(daily_record)
            
            current_date += timedelta(days=1)
            day_in_period += 1
    
    print()
    print(f"✅ Generated {len(all_daily_records)} daily records from {len(period_data)} periods")
    print()
    
    # Convert to DataFrame
    df = pd.DataFrame(all_daily_records)
    
    # Sort by date and station
    df = df.sort_values(['date', 'station_name'])
    
    # Calculate lag features
    print("Calculating lag features...")
    for station_id in df['station_id'].unique():
        station_df = df[df['station_id'] == station_id].copy()
        station_df = station_df.sort_values('date')
        
        # Lag features
        station_df['salinity_lag_1d'] = station_df['salinity_ppt'].shift(1)
        station_df['salinity_lag_7d'] = station_df['salinity_ppt'].shift(7)
        station_df['salinity_lag_14d'] = station_df['salinity_ppt'].shift(14)
        station_df['discharge_lag_1d'] = station_df['discharge_TC_m3s'].shift(1)
        station_df['discharge_lag_7d'] = station_df['discharge_TC_m3s'].shift(7)
        station_df['discharge_lag_14d'] = station_df['discharge_TC_m3s'].shift(14)
        station_df['tide_lag_1d'] = station_df['tide_vungtau_m'].shift(1)
        station_df['tide_lag_7d'] = station_df['tide_vungtau_m'].shift(7)
        station_df['tide_lag_14d'] = station_df['tide_vungtau_m'].shift(14)
        
        # Update in main dataframe
        for col in ['salinity_lag_1d', 'salinity_lag_7d', 'salinity_lag_14d',
                    'discharge_lag_1d', 'discharge_lag_7d', 'discharge_lag_14d',
                    'tide_lag_1d', 'tide_lag_7d', 'tide_lag_14d']:
            df.loc[df['station_id'] == station_id, col] = station_df[col].values
    
    # Fill NaN in lag features with 0
    lag_cols = [col for col in df.columns if 'lag' in col]
    df[lag_cols] = df[lag_cols].fillna(0)
    
    # Add ENSO (currently 0, can be fetched later)
    df['nino34_anom'] = 0.0
    
    # Save to JSON
    print(f"Saving to {output_path}...")
    output_path_obj = Path(output_path)
    output_path_obj.parent.mkdir(parents=True, exist_ok=True)
    
    records_dict = df.to_dict('records')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(records_dict, f, ensure_ascii=False, indent=2)
    
    # Save to CSV
    csv_path = output_path.replace('.json', '.csv')
    df.to_csv(csv_path, index=False, encoding='utf-8-sig')
    print(f"Saved to {csv_path}")
    print()
    
    # Summary
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Total daily records: {len(df)}")
    print(f"Unique stations: {df['station_name'].nunique()}")
    print(f"Date range: {df['date'].min()} to {df['date'].max()}")
    print(f"Records per station:")
    for station in df['station_name'].unique():
        count = len(df[df['station_name'] == station])
        print(f"   {station}: {count} records")
    print()
    
    return df

if __name__ == "__main__":
    df = generate_daily_records_from_periods()
    print("✅ Done!")
