#!/usr/bin/env python3
"""
Generate realistic Mekong Delta salinity training dataset for AI/ML models.
"""

import os
import json
import requests
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import warnings
warnings.filterwarnings('ignore')

try:
    import geopandas as gpd
    from shapely.geometry import Polygon, Point
    from shapely.ops import unary_union
    HAS_GEO = True
except ImportError:
    HAS_GEO = False
    print("Warning: geopandas/shapely not available. GeoJSON generation will be limited.")

SALINITY_EXTREME_YEARS = [2010, 2013, 2016, 2020, 2024]
SALINITY_SEVERITY_MULTIPLIERS = {
    2010: 1.3,
    2013: 1.4,
    2016: 1.8,
    2020: 1.7,
    2024: 1.6,
}
EXTREME_IMPACT_MONTHS = [1, 2, 3, 4]

STATIONS = [
    {"station_id": "TG01", "station_name": "MyTho", "province": "TienGiang", "lat": 10.36, "lon": 106.36, "river_branch": "Tien", "distance_to_sea_km": 60, "elevation_m": 1.0},
    {"station_id": "TG02", "station_name": "CaiBe", "province": "TienGiang", "lat": 10.41, "lon": 105.97, "river_branch": "Tien", "distance_to_sea_km": 90, "elevation_m": 1.2},
    {"station_id": "TG03", "station_name": "Cua_Tieu", "province": "TienGiang", "lat": 10.27, "lon": 106.74, "river_branch": "Tien_Estu", "distance_to_sea_km": 20, "elevation_m": 0.8},
    {"station_id": "TG04", "station_name": "Cua_Dai", "province": "TienGiang", "lat": 10.28, "lon": 106.83, "river_branch": "Tien_Estu", "distance_to_sea_km": 10, "elevation_m": 0.7},
    {"station_id": "TG05", "station_name": "ChoGao", "province": "TienGiang", "lat": 10.40, "lon": 106.74, "river_branch": "Canal", "distance_to_sea_km": 35, "elevation_m": 0.9},
    {"station_id": "CT01", "station_name": "CanTho", "province": "CanTho", "lat": 10.04, "lon": 105.79, "river_branch": "Hau", "distance_to_sea_km": 75, "elevation_m": 1.5},
    {"station_id": "CT02", "station_name": "PhongDien", "province": "CanTho", "lat": 9.98, "lon": 105.65, "river_branch": "Hau", "distance_to_sea_km": 85, "elevation_m": 1.3},
    {"station_id": "KG01", "station_name": "RachGia", "province": "KienGiang", "lat": 10.01, "lon": 105.08, "river_branch": "Coastal", "distance_to_sea_km": 5, "elevation_m": 0.5},
    {"station_id": "KG02", "station_name": "HaTien", "province": "KienGiang", "lat": 10.38, "lon": 104.48, "river_branch": "Coastal", "distance_to_sea_km": 2, "elevation_m": 0.3},
    {"station_id": "BT01", "station_name": "BenTre", "province": "BenTre", "lat": 10.24, "lon": 106.38, "river_branch": "Tien", "distance_to_sea_km": 50, "elevation_m": 1.1},
    {"station_id": "BT02", "station_name": "BaTri", "province": "BenTre", "lat": 10.07, "lon": 106.58, "river_branch": "Coastal", "distance_to_sea_km": 15, "elevation_m": 0.6},
    {"station_id": "ST01", "station_name": "SocTrang", "province": "SocTrang", "lat": 9.60, "lon": 105.97, "river_branch": "Hau", "distance_to_sea_km": 55, "elevation_m": 1.0},
    {"station_id": "ST02", "station_name": "TranDe", "province": "SocTrang", "lat": 9.48, "lon": 106.20, "river_branch": "Coastal", "distance_to_sea_km": 8, "elevation_m": 0.4},
    {"station_id": "TV01", "station_name": "TraVinh", "province": "TraVinh", "lat": 9.93, "lon": 106.35, "river_branch": "Coastal", "distance_to_sea_km": 25, "elevation_m": 0.7},
    {"station_id": "TV02", "station_name": "CauQuan", "province": "TraVinh", "lat": 9.85, "lon": 106.28, "river_branch": "Coastal", "distance_to_sea_km": 30, "elevation_m": 0.8},
    {"station_id": "BL01", "station_name": "BacLieu", "province": "BacLieu", "lat": 9.29, "lon": 105.72, "river_branch": "Coastal", "distance_to_sea_km": 12, "elevation_m": 0.5},
    {"station_id": "CM01", "station_name": "CaMau", "province": "CaMau", "lat": 9.18, "lon": 105.15, "river_branch": "Coastal", "distance_to_sea_km": 18, "elevation_m": 0.4},
    {"station_id": "CM02", "station_name": "NamCan", "province": "CaMau", "lat": 8.75, "lon": 104.98, "river_branch": "Coastal", "distance_to_sea_km": 3, "elevation_m": 0.2},
    {"station_id": "AG01", "station_name": "ChauDoc", "province": "AnGiang", "lat": 10.70, "lon": 105.12, "river_branch": "Hau", "distance_to_sea_km": 150, "elevation_m": 2.0},
    {"station_id": "AG02", "station_name": "LongXuyen", "province": "AnGiang", "lat": 10.38, "lon": 105.42, "river_branch": "Hau", "distance_to_sea_km": 120, "elevation_m": 1.8},
]


def fetch_and_parse_nino34() -> pd.DataFrame:
    url = "https://psl.noaa.gov/data/correlation/nina34.anom.data"
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        lines = response.text.strip().split('\n')
    except Exception as e:
        print(f"Failed to download ENSO data: {e}")
        return simulate_enso_data()
    
    data = []
    for line in lines:
        if not line.strip() or line.startswith('YEAR'):
            continue
        parts = line.split()
        if len(parts) < 13:
            continue
        try:
            year = int(parts[0])
            for month in range(1, 13):
                try:
                    val = float(parts[month])
                    if val != -99.99:
                        data.append({'year': year, 'month': month, 'nino34_anom': val})
                except (ValueError, IndexError):
                    continue
        except (ValueError, IndexError):
            continue
    
    df = pd.DataFrame(data)
    if len(df) == 0:
        return simulate_enso_data()
    
    df['oni'] = df['nino34_anom'].rolling(window=3, center=True, min_periods=1).mean()
    return df


def simulate_enso_data() -> pd.DataFrame:
    dates = pd.date_range('2010-01-01', '2024-12-31', freq='MS')
    np.random.seed(42)
    nino34 = np.random.normal(0, 0.8, len(dates))
    nino34 = pd.Series(nino34).rolling(window=3, center=True).mean().fillna(0)
    nino34 = np.clip(nino34, -2.5, 2.5)
    
    df = pd.DataFrame({
        'year': dates.year,
        'month': dates.month,
        'nino34_anom': nino34.values,
        'oni': nino34.values
    })
    return df


def simulate_discharge_tc(dates: pd.DatetimeIndex, nino34_series: pd.Series, extreme_years: List[int]) -> pd.Series:
    day_of_year = dates.dayofyear
    base = 8000 + 4000 * np.sin(2 * np.pi * (day_of_year - 90) / 365.25)
    
    seasonal_weight = np.where((dates.month >= 2) & (dates.month <= 4), 0.35, 0.15)
    enso_factor = 1 - 0.3 * np.maximum(0, nino34_series.values) * seasonal_weight
    discharge = base * enso_factor
    
    for year in extreme_years:
        mask = (dates.year == year) & (dates.month.isin(EXTREME_IMPACT_MONTHS))
        discharge = np.where(mask, discharge * (1 - 0.4 * SALINITY_SEVERITY_MULTIPLIERS.get(year, 1.0) / 2.0), discharge)
    
    noise = np.random.normal(0, discharge * 0.12, len(discharge))
    discharge = discharge + noise
    discharge = np.clip(discharge, 1200, 25000)
    
    return pd.Series(discharge, index=dates)


def simulate_tide_vungtau(dates: pd.DatetimeIndex) -> pd.Series:
    days = np.arange(len(dates))
    spring_neap = 0.5 + 0.2 * np.sin(2 * np.pi * days / 14.5)
    diurnal = 0.1 * np.sin(2 * np.pi * days)
    
    seasonal_offset = np.where((dates.month >= 11) | (dates.month <= 4), 0.15, -0.15)
    
    tide = spring_neap + diurnal + seasonal_offset
    noise = np.random.normal(0, 0.05, len(tide))
    tide = tide + noise
    
    return pd.Series(tide, index=dates)


def simulate_rainfall_mekong(dates: pd.DatetimeIndex, nino34_series: pd.Series, 
                             distance_to_sea_km: float) -> pd.Series:
    day_of_year = dates.dayofyear
    base = 5 + 5 * np.maximum(0, np.sin(2 * np.pi * (day_of_year - 120) / 365.25))
    
    enso_reduction = np.where(
        (nino34_series.values > 0.5) & ((dates.month >= 11) | (dates.month <= 4)),
        0.3, 0.0
    )
    base = base * (1 - enso_reduction)
    
    spatial_factor = 1 - 0.25 * min(distance_to_sea_km / 100, 1.0)
    base = base * spatial_factor
    
    rainfall = np.random.gamma(shape=1.5, scale=base, size=len(dates))
    rainfall = np.where(rainfall < 0.5, 0, rainfall)
    rainfall = np.clip(rainfall, 0, 100)
    
    return pd.Series(rainfall, index=dates)


def simulate_water_level(dates: pd.DatetimeIndex, discharge: pd.Series, 
                        tide: pd.Series, rainfall: pd.Series, base_elevation: float) -> pd.Series:
    discharge_norm = (discharge - discharge.mean()) / discharge.std()
    rainfall_7d = rainfall.rolling(window=7, min_periods=1).mean()
    
    water_level = (base_elevation + 
                   0.3 * discharge_norm + 
                   0.4 * tide + 
                   0.1 * rainfall_7d)
    water_level = np.clip(water_level, 0.5, 3.0)
    
    return pd.Series(water_level, index=dates)


def simulate_station_salinity(distance_to_sea_km: float, elevation_m: float,
                             discharge_tc: pd.Series, tide: pd.Series,
                             rainfall: pd.Series, water_level: pd.Series,
                             nino34: pd.Series, dates: pd.DatetimeIndex,
                             extreme_years: List[int]) -> pd.Series:
    L = 70
    dist_factor = np.exp(-distance_to_sea_km / L)
    
    Q_norm = (discharge_tc - discharge_tc.mean()) / (discharge_tc.std() + 1e-6)
    WL_norm = (water_level - water_level.mean()) / (water_level.std() + 1e-6)
    rainfall_factor = 1 / (1 + rainfall / 10)
    
    nino_smooth = pd.Series(nino34.values, index=dates).rolling(30, min_periods=1).mean()
    
    A0, A1, A2, A3, A4, A5, A6 = 25, 3, 2, 1.5, 2, 1.5, 0.5
    
    salinity_gL = (A0 * dist_factor + 
                   A1 * tide.values - 
                   A2 * Q_norm.values - 
                   A3 * WL_norm.values - 
                   A4 * rainfall_factor.values + 
                   A5 * nino_smooth.values - 
                   A6 * elevation_m)
    
    mask_extreme = np.isin(dates.year, extreme_years)
    extreme_multiplier = np.ones(len(dates))
    for year in extreme_years:
        year_mask = (dates.year == year) & (dates.month.isin(EXTREME_IMPACT_MONTHS))
        extreme_multiplier[year_mask] = SALINITY_SEVERITY_MULTIPLIERS.get(year, 1.0)
    
    salinity_gL = salinity_gL * extreme_multiplier
    
    noise = np.random.normal(0, 0.5, len(salinity_gL))
    salinity_gL = salinity_gL + noise
    salinity_gL = np.clip(salinity_gL, 0, 35)
    
    return pd.Series(salinity_gL, index=dates)


def build_salinity_dataset(start_date: str, end_date: str) -> pd.DataFrame:
    dates = pd.date_range(start_date, end_date, freq='D')
    
    enso_df = fetch_and_parse_nino34()
    enso_dict = dict(zip(zip(enso_df['year'], enso_df['month']), enso_df['nino34_anom']))
    nino34_daily = pd.Series([enso_dict.get((d.year, d.month), 0.0) for d in dates], index=dates)
    
    discharge = simulate_discharge_tc(dates, nino34_daily, SALINITY_EXTREME_YEARS)
    tide = simulate_tide_vungtau(dates)
    
    all_data = []
    for station in STATIONS:
        rainfall = simulate_rainfall_mekong(dates, nino34_daily, station['distance_to_sea_km'])
        water_level = simulate_water_level(dates, discharge, tide, rainfall, station['elevation_m'])
        salinity = simulate_station_salinity(
            station['distance_to_sea_km'], station['elevation_m'],
            discharge, tide, rainfall, water_level, nino34_daily, dates, SALINITY_EXTREME_YEARS
        )
        
        for i, date in enumerate(dates):
            all_data.append({
                'station_id': station['station_id'],
                'station_name': station['station_name'],
                'province': station['province'],
                'lat': station['lat'],
                'lon': station['lon'],
                'river_branch': station['river_branch'],
                'distance_to_sea_km': station['distance_to_sea_km'],
                'elevation_m': station['elevation_m'],
                'date': date,
                'year': date.year,
                'month': date.month,
                'day_of_year': date.dayofyear,
                'salinity_ppt': salinity.iloc[i],
                'salinity_gL': salinity.iloc[i],
                'discharge_TC_m3s': discharge.iloc[i],
                'tide_vungtau_m': tide.iloc[i],
                'rainfall_mm': rainfall.iloc[i],
                'water_level_m': water_level.iloc[i],
                'nino34_anom': nino34_daily.iloc[i],
            })
    
    df = pd.DataFrame(all_data)
    df = df.sort_values(['station_id', 'date']).reset_index(drop=True)
    
    for lag in [1, 7, 14, 30, 60]:
        df[f'salinity_lag_{lag}d'] = df.groupby('station_id')['salinity_ppt'].shift(lag)
        df[f'discharge_lag_{lag}d'] = df.groupby('station_id')['discharge_TC_m3s'].shift(lag)
        df[f'tide_lag_{lag}d'] = df.groupby('station_id')['tide_vungtau_m'].shift(lag)
    
    return df, enso_df


def generate_salinity_boundaries(df: pd.DataFrame, dates: pd.DatetimeIndex) -> None:
    if not HAS_GEO:
        print("Skipping GeoJSON generation (geopandas not available)")
        return
    
    os.makedirs('salinity_boundaries_geojson', exist_ok=True)
    
    for date in dates[::7]:
        date_str = date.strftime('%Y-%m-%d')
        date_df = df[df['date'] == date].copy()
        
        if len(date_df) == 0:
            continue
        
        features = []
        for threshold in [1.0, 4.0]:
            above_threshold = date_df[date_df['salinity_ppt'] >= threshold]
            if len(above_threshold) < 3:
                continue
            
            try:
                points = [Point(lon, lat) for lon, lat in 
                         zip(above_threshold['lon'], above_threshold['lat'])]
                if len(points) >= 3:
                    hull = unary_union(points).convex_hull
                    if isinstance(hull, Polygon):
                        coords = [[[lon, lat] for lon, lat in hull.exterior.coords]]
                        features.append({
                            'type': 'Feature',
                            'geometry': {
                                'type': 'Polygon',
                                'coordinates': coords
                            },
                            'properties': {
                                'date': date_str,
                                'salinity': threshold,
                                'confidence': 0.85
                            }
                        })
            except Exception as e:
                continue
        
        if features:
            geojson = {
                'type': 'FeatureCollection',
                'features': features
            }
            filename = f'salinity_boundaries_geojson/boundaries_{date_str}.geojson'
            with open(filename, 'w') as f:
                json.dump(geojson, f)


def calculate_risk_surface(df: pd.DataFrame, dates: pd.DatetimeIndex, 
                           grid_resolution: float = 0.05) -> pd.DataFrame:
    lat_min, lat_max = 8.5, 10.5
    lon_min, lon_max = 104.5, 106.5
    
    lats = np.arange(lat_min, lat_max + grid_resolution, grid_resolution)
    lons = np.arange(lon_min, lon_max + grid_resolution, grid_resolution)
    
    risk_data = []
    consecutive_days = {}
    
    for date in dates[::1]:
        date_df = df[df['date'] == date].copy()
        if len(date_df) == 0:
            continue
        
        for lat in lats:
            for lon in lons:
                distances = np.sqrt((date_df['lat'] - lat)**2 + (date_df['lon'] - lon)**2) * 111
                weights = 1 / (distances**2 + 0.1)
                weights = weights / weights.sum()
                
                salinity_interp = (date_df['salinity_ppt'] * weights).sum()
                
                key = (round(lat, 2), round(lon, 2))
                if salinity_interp >= 1.0:
                    consecutive_days[key] = consecutive_days.get(key, 0) + 1
                else:
                    consecutive_days[key] = 0
                
                if salinity_interp >= 4.0:
                    intensity_risk = 75 + (salinity_interp - 4.0) * 5
                elif salinity_interp >= 1.0:
                    intensity_risk = 25 + (salinity_interp - 1.0) * 16.67
                else:
                    intensity_risk = salinity_interp * 25
                
                duration_penalty = min(consecutive_days.get(key, 0) * 2, 20)
                risk_score = min(intensity_risk + duration_penalty, 100)
                
                nearest_idx = distances.idxmin()
                nearest_station = date_df.loc[nearest_idx, 'station_id']
                nearest_dist = distances.min()
                
                risk_data.append({
                    'date': date,
                    'lat': lat,
                    'lon': lon,
                    'risk_score': risk_score,
                    'salinity_1ppt': 1.0 if salinity_interp >= 1.0 else 0.0,
                    'salinity_4ppt': 1.0 if salinity_interp >= 4.0 else 0.0,
                    'confidence': max(0.5, 1.0 - nearest_dist / 50),
                    'nearest_station_id': nearest_station,
                    'nearest_station_distance_km': nearest_dist
                })
    
    return pd.DataFrame(risk_data)


def main():
    print("Generating Mekong Delta salinity training dataset...")
    print(f"Stations: {len(STATIONS)}")
    
    start_date = "2010-01-01"
    end_date = "2024-12-31"
    dates = pd.date_range(start_date, end_date, freq='D')
    print(f"Date range: {start_date} to {end_date} ({len(dates)} days)")
    
    print("\n1. Fetching ENSO data...")
    enso_df = fetch_and_parse_nino34()
    enso_df.to_csv('enso_indices_monthly.csv', index=False)
    print(f"   Saved: enso_indices_monthly.csv ({len(enso_df)} records)")
    
    print("\n2. Building salinity dataset...")
    df, _ = build_salinity_dataset(start_date, end_date)
    print(f"   Generated {len(df)} station-day records")
    print(f"   Salinity range: {df['salinity_ppt'].min():.2f} - {df['salinity_ppt'].max():.2f} ppt")
    print(f"   Stations: {df['station_id'].nunique()}")
    
    print("\n3. Saving station data...")
    df.to_csv('mekong_delta_salinity_stations.csv', index=False)
    print(f"   Saved: mekong_delta_salinity_stations.csv")
    
    print("\n4. Generating salinity boundaries (sampling weekly)...")
    sample_dates = dates[::7]
    generate_salinity_boundaries(df, sample_dates)
    print(f"   Generated GeoJSON files for {len(sample_dates)} dates")
    
    print("\n5. Calculating risk surface (sampling daily, reduced grid)...")
    sample_dates_risk = dates[::30]
    risk_df = calculate_risk_surface(df, sample_dates_risk, grid_resolution=0.1)
    risk_df.to_csv('risk_surface_daily.csv', index=False)
    print(f"   Saved: risk_surface_daily.csv ({len(risk_df)} records)")
    
    print("\n✓ Dataset generation complete!")
    print(f"\nOutput files:")
    print(f"  - enso_indices_monthly.csv")
    print(f"  - mekong_delta_salinity_stations.csv")
    print(f"  - salinity_boundaries_geojson/ (directory)")
    print(f"  - risk_surface_daily.csv")


if __name__ == "__main__":
    np.random.seed(42)
    main()

