#!/usr/bin/env python3
"""
Script để derive các features cần thiết từ dữ liệu thực đã crawl được.
"""

import json
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import re

# Station metadata (hardcoded)
STATION_METADATA = {
    "Nhà Bè": {"station_id": "HCM01", "elevation_m": 0.5, "distance_to_sea_km": 38.0},
    "Cát Lái": {"station_id": "HCM02", "elevation_m": 0.8, "distance_to_sea_km": 58.0},
    "Lý Nhơn": {"station_id": "HCM03", "elevation_m": 0.3, "distance_to_sea_km": 7.0},
    "Long Đại": {"station_id": "HCM04", "elevation_m": 1.0, "distance_to_sea_km": 80.0},
    "Vũng Tàu": {"station_id": "VT01", "elevation_m": 0.0, "distance_to_sea_km": 0.0},
}


def parse_date_from_period(period_str: str) -> Optional[datetime]:
    """Parse date from observed_period string like 'Smax thực đo từ 21/03 - 31/03 (‰)'"""
    if not period_str:
        return None
    # Extract date range
    match = re.search(r'(\d{2})/(\d{2})\s*-\s*(\d{2})/(\d{2})', period_str)
    if match:
        # Use end date
        day, month = int(match.group(3)), int(match.group(4))
        # Assume current year or extract from filename
        year = 2024  # Default, should extract from source_file
        try:
            return datetime(year, month, day)
        except:
            return None
    return None


def calculate_tide_vungtau(high_tides: List[Dict], low_tides: List[Dict]) -> Optional[float]:
    """Calculate average tide from high and low tides."""
    if not high_tides or not low_tides:
        return None
    
    high_levels = [h.get('level_m') for h in high_tides if h.get('level_m') is not None]
    low_levels = [l.get('level_m') for l in low_tides if l.get('level_m') is not None]
    
    if not high_levels or not low_levels:
        return None
    
    # Method 1: Average of all tide levels
    all_levels = high_levels + low_levels
    avg_tide = np.mean(all_levels)
    
    # Method 2: (max_high + min_low) / 2 (tidal range center)
    # avg_tide = (max(high_levels) + min(low_levels)) / 2
    
    return float(avg_tide)


def estimate_daily_salinity_from_smax(smax: float, day_in_period: int, period_length: int = 10) -> float:
    """
    Estimate daily salinity from smax_observed.
    Assumes salinity varies within period, with max at some point.
    """
    if smax <= 0:
        return 0.0
    
    # Conservative estimate: daily is 70-100% of max
    # Higher near end of period (when max typically occurs)
    factor = 0.7 + 0.3 * (day_in_period / max(period_length, 1))
    return smax * factor


def estimate_rainfall_from_season(month: int) -> float:
    """Estimate rainfall based on season (dry vs wet)."""
    # Dry season: Nov-Apr (months 11,12,1,2,3,4)
    # Wet season: May-Oct (months 5,6,7,8,9,10)
    if month in [11, 12, 1, 2, 3, 4]:
        # Dry season: 0-2mm/day average
        return np.random.uniform(0, 2)
    else:
        # Wet season: 5-10mm/day average
        return np.random.uniform(5, 10)


def fetch_nino34_anom(date: datetime) -> float:
    """Fetch or estimate Nino34 anomaly. For now, return 0 or fetch from API."""
    # TODO: Implement actual fetch from NOAA
    # For now, return 0 (neutral ENSO)
    return 0.0


def derive_features_from_existing_data() -> pd.DataFrame:
    """
    Derive all required features from existing crawled data.
    Returns DataFrame in format compatible with model.
    """
    # Load existing data
    with open('extracted_data/station_data_extracted.json') as f:
        extracted_data = json.load(f)
    
    with open('th2i_output/th2i_tide_measured.json') as f:
        tide_measured = json.load(f)
    
    with open('th2i_output/th2i_observation.json') as f:
        observation_data = json.load(f)
    
    # Create lookup dictionaries
    tide_lookup = {}
    for record in tide_measured.get('records', []):
        station = record.get('station')
        if station == 'Vũng Tàu':
            tide_lookup['Vũng Tàu'] = calculate_tide_vungtau(
                record.get('high_tides', []),
                record.get('low_tides', [])
            )
    
    observation_lookup = {}
    for record in observation_data.get('records', []):
        station = record.get('station')
        # rain_mm: null = 0mm (no rain), not missing data
        rain_mm = record.get('rain_mm')
        if rain_mm is None:
            rain_mm = 0.0  # null means no rain
        
        observation_lookup[station] = {
            'water_level_m': record.get('water_level_m'),
            'inflow_m3s': record.get('inflow_m3s'),
            'discharge_m3s': record.get('discharge_m3s'),
            'rain_mm': rain_mm,  # Use actual data, null = 0
        }
    
    # Build dataset
    all_records = []
    
    for item in extracted_data:
        station_name = item.get('station_name')
        if station_name not in STATION_METADATA:
            continue
        
        metadata = STATION_METADATA[station_name]
        
        # Parse date
        period_str = item.get('observed_period', '')
        date = parse_date_from_period(period_str)
        if not date:
            # Try to extract from source_file
            source_file = item.get('source_file', '')
            # Extract date from filename like HOCM_XMAN_20240331_1530.pdf
            match = re.search(r'(\d{8})', source_file)
            if match:
                date_str = match.group(1)
                date = datetime.strptime(date_str, '%Y%m%d')
            else:
                continue
        
        # Derive features
        smax = item.get('smax_observed', 0)
        if smax is None:
            smax = 0
        
        # Estimate daily salinity (use middle of period)
        salinity_ppt = estimate_daily_salinity_from_smax(smax, day_in_period=5, period_length=10)
        
        # Get discharge
        obs = observation_lookup.get(station_name, {})
        discharge_TC_m3s = obs.get('inflow_m3s') or obs.get('discharge_m3s') or 0.0
        
        # Get tide (use Vũng Tàu for all stations)
        tide_vungtau_m = tide_lookup.get('Vũng Tàu', 0.0)
        
        # Get rainfall from observation (null = 0mm means no rain, not missing)
        rainfall_mm = obs.get('rain_mm', None)
        if rainfall_mm is None:
            # Station not in observation data, estimate from season
            rainfall_mm = estimate_rainfall_from_season(date.month)
            rainfall_source = 'estimated'
        else:
            # Use actual data from observation: null was already converted to 0.0 in lookup
            rainfall_mm = float(rainfall_mm)
            rainfall_source = 'observation' if rainfall_mm == 0.0 else 'observation'
        
        # Get water level
        water_level_m = obs.get('water_level_m', 0.0)
        
        # Get ENSO
        nino34_anom = fetch_nino34_anom(date)
        
        # Build record
        record = {
            'station_id': metadata['station_id'],
            'station_name': station_name,
            'date': date.strftime('%Y-%m-%d'),
            'year': date.year,
            'month': date.month,
            'day_of_year': date.timetuple().tm_yday,
            'salinity_ppt': salinity_ppt,
            'discharge_TC_m3s': discharge_TC_m3s,
            'tide_vungtau_m': tide_vungtau_m,
            'rainfall_mm': rainfall_mm,
            'water_level_m': water_level_m,
            'nino34_anom': nino34_anom,
            'distance_to_sea_km': metadata['distance_to_sea_km'],
            'elevation_m': metadata['elevation_m'],
        }
        
        all_records.append(record)
    
    # Create DataFrame
    df = pd.DataFrame(all_records)
    
    if len(df) == 0:
        return df
    
    # Sort by station and date
    df = df.sort_values(['station_id', 'date']).reset_index(drop=True)
    
    # Calculate lag features
    for lag in [1, 7, 14]:
        df[f'salinity_lag_{lag}d'] = df.groupby('station_id')['salinity_ppt'].shift(lag)
        df[f'discharge_lag_{lag}d'] = df.groupby('station_id')['discharge_TC_m3s'].shift(lag)
        df[f'tide_lag_{lag}d'] = df.groupby('station_id')['tide_vungtau_m'].shift(lag)
    
    # Fill NaN with forward fill, then backward fill, then 0
    df = df.ffill().bfill().fillna(0)
    
    return df


def main():
    print("=" * 80)
    print("DERIVE FEATURES TỪ DỮ LIỆU HIỆN CÓ")
    print("=" * 80)
    print()
    
    df = derive_features_from_existing_data()
    
    if len(df) == 0:
        print("❌ Không tạo được dataset (thiếu dữ liệu hoặc lỗi parse)")
        return
    
    print(f"✅ Đã tạo dataset với {len(df)} records")
    print(f"   Stations: {df['station_id'].nunique()}")
    print(f"   Date range: {df['date'].min()} to {df['date'].max()}")
    print()
    
    print("Sample data:")
    print(df.head(10).to_string())
    print()
    
    # Check feature completeness
    required_features = [
        'salinity_ppt', 'discharge_TC_m3s', 'tide_vungtau_m',
        'rainfall_mm', 'water_level_m', 'nino34_anom',
        'salinity_lag_1d', 'salinity_lag_7d',
        'discharge_lag_1d', 'tide_lag_1d',
        'distance_to_sea_km', 'elevation_m',
        'month', 'day_of_year'
    ]
    
    print("Feature completeness:")
    for feat in required_features:
        if feat in df.columns:
            missing = df[feat].isna().sum()
            zero_count = (df[feat] == 0).sum()
            print(f"  ✅ {feat}: {len(df) - missing - zero_count}/{len(df)} non-zero values")
        else:
            print(f"  ❌ {feat}: MISSING")
    
    # Save to CSV
    output_path = Path('dataset/hcm_salinity_derived.csv')
    output_path.parent.mkdir(exist_ok=True)
    df.to_csv(output_path, index=False)
    print()
    print(f"✅ Saved to: {output_path}")
    print()
    print("⚠️  LƯU Ý:")
    print("   - salinity_ppt là estimate từ smax_observed (không chính xác 100%)")
    print("   - rainfall_mm: Ưu tiên từ th2i_observation (null = 0mm = không mưa)")
    print("     * Nếu có trong observation: dùng giá trị thực (null → 0.0)")
    print("     * Nếu không có: estimate từ season")
    print("   - nino34_anom = 0 (cần fetch từ NOAA)")
    print("   - Cần thêm nhiều records để train model hiệu quả")


if __name__ == '__main__':
    main()
