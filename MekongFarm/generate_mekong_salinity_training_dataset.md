
> You are an expert Python + data engineering assistant.  
> Goal: Implement a Python script `generate_mekong_salinity_training_dataset.py` that creates **realistic, Mekong-Delta-style salinity time series and spatio-temporal datasets** for AI/ML model training. The script should:
> 
> 1. **Ingest real external climate / hydrology signals (where possible)**  
> 2. **Simulate missing pieces (especially station-level salinity)** with simple but physically plausible relationships based on Mekong scientific papers.  
> 3. **Generate spatio-temporal data** for boundary prediction (1‰ and 4‰ salinity thresholds) and risk scoring.
> 4. **Write clean CSV and GeoJSON files** ready for ML training (LSTM/GRU/ConvLSTM/GNN) and for a FastAPI + React/Mapbox pipeline.
> 
> Please:
> - Write **runnable Python 3.10+ code** (no pseudocode).  
> - Use only standard libraries + `numpy`, `pandas`, `requests`, `beautifulsoup4`, `geopandas`, `shapely` (if needed).  
> - Keep the code in a **single .py file** with a `main()` function and `if __name__ == "__main__": main()`.  
> - Add only minimal comments (focus on code, not explanations).
> 
> ---
> 
> ## 1. Overall design
> 
> The script should generate **multiple output files**:
> 
> 1. `enso_indices_monthly.csv`  
>    - Parsed from NOAA PSL ENSO index data (Niño 3.4, optionally ONI/SOI if easy).  
> 
> 2. `mekong_delta_salinity_stations.csv`  
>    - Daily salinity time series for **20+ stations across Mekong Delta** (Tiền Giang, Cần Thơ, Kiên Giang, Bến Tre, Sóc Trăng, Trà Vinh, Bạc Liêu, Cà Mau) over ~15 years.  
>    - Includes lag features and drivers (discharge, tide, rainfall, water level, ENSO, spatial attributes).
> 
> 3. `salinity_boundaries_geojson/` (directory)
>    - Daily GeoJSON files for salinity boundaries (1‰ and 4‰ thresholds)
>    - Format: `boundaries_YYYY-MM-DD.geojson`
>    - Each file contains FeatureCollection with Polygon features for each threshold
> 
> 4. `risk_surface_daily.csv`
>    - Daily risk scores (0-100) on a spatial grid covering Mekong Delta
>    - Columns: `date, lat, lon, risk_score, salinity_1ppt, salinity_4ppt, confidence`
> 
> The script should have functions like:
> 
> - `fetch_and_parse_nino34()`  
> - `fetch_and_parse_optional_indices()` (optional, if easy)  
> - `simulate_discharge_tc()`  
> - `simulate_tide_vungtau()`  
> - `simulate_rainfall_mekong()`  
> - `simulate_water_level()`  
> - `simulate_station_salinity()`  
> - `generate_salinity_boundaries()`  
> - `calculate_risk_surface()`  
> - `build_salinity_dataset()`  
> - `write_csvs_and_geojson()`
> 
> ---
> 
> ## 2. ENSO data (real)
> 
> Use **real Niño 3.4 monthly anomalies** as the ENSO driver.
> 
> Requirements:
> 
> 1. Download **Niño 3.4 anomaly** from NOAA PSL:  
>    - Primary URL: `https://psl.noaa.gov/data/correlation/nina34.anom.data` (ASCII).  
>    - Fallback: read from local file if download fails.  
> 
> 2. Parse into a DataFrame with columns:
> 
> ```text
> year, month, nino34_anom
> ```
> 
> 3. Save as `enso_indices_monthly.csv` (UTF‑8, comma‑separated).  
> 
> 4. Provide a helper to map from **daily date** to ENSO:
> 
> - For each daily date, use the current month's `nino34_anom`.  
> - Example: date 2016‑02‑15 uses ENSO index for 2016‑02.  
> 
> Optionally (bonus if simple):
> - Also construct ONI (3‑month running mean of Niño 3.4) and store as `oni`.  
> 
> ---
> 
> ## 3. Historical context and real-world data references
> 
> To ensure the simulated data is accurate and realistic, incorporate **verified historical information** about Mekong Delta salinity intrusion events based on scientific reports, government data, and research publications.
> 
> ### 3.1 Extreme salinity years (verified historical records)
> 
> Based on documented historical events:
> 
> - **2016**: Severe El Niño year, record-breaking salt intrusion. Salinity penetrated 70-90 km inland. Discharge at Tan Chau dropped to ~2000-3000 m³/s during peak dry season (Feb-Apr). Affected ~160,000 hectares of agricultural land.
> - **2020**: Another severe year with extensive salt intrusion, affecting ~58,000 hectares of rice fields. Discharge remained low throughout dry season, starting earlier than usual (January).
> - **2010, 2013**: Moderate to severe salt intrusion years with significant agricultural impact.
> - **2024**: Recent severe event with early onset (January-February), similar pattern to 2020.
> 
> Hardcode the list with severity multipliers:
> 
> ```python
> SALINITY_EXTREME_YEARS = [2010, 2013, 2016, 2020, 2024]
> 
> # Severity multipliers for each extreme year (1.0 = normal, higher = more severe)
> # These should increase salinity by 30-80% during dry season months
> SALINITY_SEVERITY_MULTIPLIERS = {
>     2010: 1.3,  # Moderate severity
>     2013: 1.4,  # Moderate-severe
>     2016: 1.8,  # Most severe (El Niño peak year)
>     2020: 1.7,  # Severe
>     2024: 1.6,  # Severe
> }
> 
> # Months when extreme years have maximum impact (dry season)
> EXTREME_IMPACT_MONTHS = [1, 2, 3, 4]  # Jan, Feb, Mar, Apr
> ```
> 
> ### 3.2 Real-world discharge data (Tan Chau station reference)
> 
> Historical discharge ranges at Tan Chau (upstream Mekong, Vietnam-Cambodia border):
> 
> - **Wet season (Aug-Oct)**: 
>   - Normal years: 10,000-15,000 m³/s
>   - La Niña years: Can reach 20,000+ m³/s
>   - Peak flood: Up to 25,000 m³/s
> - **Dry season (Feb-Apr)**: 
>   - Normal years: 3,000-5,000 m³/s
>   - El Niño years: 2,000-3,000 m³/s
>   - Extreme dry season (2016, 2020): Can drop below 2,000 m³/s, sometimes as low as 1,500 m³/s
> - **Annual average**: ~8,000-10,000 m³/s
> - **Minimum recorded**: ~1,200 m³/s (during extreme drought)
> 
> Use these ranges to validate and calibrate simulated discharge values. Ensure simulated discharge respects ENSO relationships:
> - El Niño (Niño 3.4 > +0.5): 20-40% reduction in dry season discharge
> - La Niña (Niño 3.4 < -0.5): 10-30% increase in wet season discharge
> 
> ### 3.3 Salinity thresholds for rice farming (critical values)
> 
> Critical thresholds based on rice variety tolerance and agricultural practices:
> 
> - **1‰ (1 ppt)**: Early warning threshold for sensitive crops and young rice seedlings
> - **4‰ (4 ppt)**: **Critical threshold** for most rice varieties (including IR64, IR50404, OM5451)
>   - Above 4 ppt: Rice growth severely affected, yield loss >50%, requires immediate action
>   - 1-4 ppt: Moderate impact, requires careful water management and salt-tolerant varieties
>   - <1 ppt: Safe for rice cultivation, optimal conditions
> - **10‰ (10 ppt)**: Severe threshold, most rice varieties cannot survive
> - **20-30‰ (20-30 ppt)**: Near-seawater levels, only mangroves and salt-tolerant species survive
> 
> Ensure simulated salinity respects these thresholds, especially during dry season months (Jan-Apr) when farmers are most vulnerable.
> 
> ### 3.4 Salt intrusion distance (inland penetration - historical records)
> 
> Historical maximum intrusion distances from coast:
> 
> - **Normal years**: 30-50 km from coast along main river branches
> - **Severe years (2016, 2020)**: 70-90 km inland, reaching deep into agricultural areas
> - **Extreme events**: Can reach 100+ km in some river branches (Tien River, Hau River)
> - **Spatial pattern**: Intrusion is deeper along Tien River (east) than Hau River (west) due to topography
> 
> Use `distance_to_sea_km` in station definitions to reflect realistic spatial distribution. Stations closer to coast (<20 km) should show higher salinity variability.
> 
> ### 3.5 Tide data (Vung Tau reference station)
> 
> Vung Tau tide characteristics (representative of Mekong Delta coastal tides):
> 
> - **Spring tide amplitude**: 0.5-0.7 m (peak every ~14-15 days)
> - **Neap tide amplitude**: 0.2-0.3 m
> - **Diurnal variation**: ~0.1-0.2 m daily variation
> - **Seasonal variation**: 
>   - Higher tides during dry season (Nov-Apr): +0.1-0.2 m
>   - Lower tides during wet season (May-Oct): -0.1-0.2 m
> - **Tidal range**: Typically 1.5-2.5 m between high and low tide
> 
> Tide is a key driver of salt intrusion, especially during spring tides in dry season when river discharge is low.
> 
> ### 3.6 Rainfall patterns (Mekong Delta regional averages)
> 
> Mekong Delta rainfall characteristics:
> 
> - **Wet season (May-Oct)**: 
>   - Monthly average: 150-300 mm/month
>   - Peak months (Aug-Sep): 250-350 mm/month
>   - Maximum daily: 50-100 mm/day during storms
> - **Dry season (Nov-Apr)**: 
>   - Monthly average: 10-50 mm/month
>   - Lowest months (Feb-Mar): 5-20 mm/month
>   - Many days with 0 mm rainfall
> - **El Niño effect**: 20-40% reduction in dry season rainfall, delayed wet season onset
> - **La Niña effect**: 10-30% increase in wet season rainfall
> - **Spatial variation**: 
>   - Coastal areas (distance_to_sea_km < 30): Receive 20-30% less rainfall
>   - Inland areas (distance_to_sea_km > 60): Receive more consistent rainfall
> 
> ### 3.7 ENSO index ranges (for validation)
> 
> Typical Niño 3.4 anomaly ranges:
> 
> - **Strong El Niño**: +1.5 to +2.5 (e.g., 2015-2016)
> - **Moderate El Niño**: +0.5 to +1.5
> - **Neutral**: -0.5 to +0.5
> - **Moderate La Niña**: -0.5 to -1.5
> - **Strong La Niña**: -1.5 to -2.5
> 
> Ensure downloaded ENSO data falls within these ranges. If simulated ENSO is needed, use these bounds.
> 
> ### 3.8 Optional web verification (lightweight, best-effort)
> 
> Optionally, verify extreme years by attempting to scrape 2-3 Vietnamese news/government pages (best-effort, no NLP needed):
> 
> - "xâm nhập mặn ĐBSCL 2016" (MARD reports, news articles)
> - "hạn mặn ĐBSCL 2020" (government bulletins)
> - "salinity intrusion Mekong Delta" (English sources)
> 
> If HTTP fails or pages are unreachable, continue with hardcoded list. Log verification results but don't fail if unavailable. This is purely for validation, not data generation.
> 
> ---
> 
> ## 4. Time axis & stations across Mekong Delta
> 
> Use:
> 
> - `start_date = "2010-01-01"`  
> - `end_date = "2024-12-31"` (≈ 15 years)  
> - `freq="D"` for daily data.
> 
> Define **20+ stations** across Mekong Delta provinces as a Python list/dict:
> 
> ```python
> stations = [
>     # Tiền Giang
>     {"station_id": "TG01", "station_name": "MyTho",    "province": "TienGiang", "lat": 10.36, "lon": 106.36, "river_branch": "Tien",      "distance_to_sea_km": 60, "elevation_m": 1.0},
>     {"station_id": "TG02", "station_name": "CaiBe",    "province": "TienGiang", "lat": 10.41, "lon": 105.97, "river_branch": "Tien",      "distance_to_sea_km": 90, "elevation_m": 1.2},
>     {"station_id": "TG03", "station_name": "Cua_Tieu", "province": "TienGiang", "lat": 10.27, "lon": 106.74, "river_branch": "Tien_Estu", "distance_to_sea_km": 20, "elevation_m": 0.8},
>     {"station_id": "TG04", "station_name": "Cua_Dai",  "province": "TienGiang", "lat": 10.28, "lon": 106.83, "river_branch": "Tien_Estu", "distance_to_sea_km": 10, "elevation_m": 0.7},
>     {"station_id": "TG05", "station_name": "ChoGao",   "province": "TienGiang", "lat": 10.40, "lon": 106.74, "river_branch": "Canal",     "distance_to_sea_km": 35, "elevation_m": 0.9},
>     
>     # Cần Thơ
>     {"station_id": "CT01", "station_name": "CanTho",    "province": "CanTho",    "lat": 10.04, "lon": 105.79, "river_branch": "Hau",      "distance_to_sea_km": 75, "elevation_m": 1.5},
>     {"station_id": "CT02", "station_name": "PhongDien", "province": "CanTho",    "lat": 9.98,  "lon": 105.65, "river_branch": "Hau",      "distance_to_sea_km": 85, "elevation_m": 1.3},
>     
>     # Kiên Giang
>     {"station_id": "KG01", "station_name": "RachGia",  "province": "KienGiang", "lat": 10.01, "lon": 105.08, "river_branch": "Coastal",  "distance_to_sea_km": 5,  "elevation_m": 0.5},
>     {"station_id": "KG02", "station_name": "HaTien",   "province": "KienGiang", "lat": 10.38, "lon": 104.48, "river_branch": "Coastal",  "distance_to_sea_km": 2,  "elevation_m": 0.3},
>     
>     # Bến Tre
>     {"station_id": "BT01", "station_name": "BenTre",   "province": "BenTre",    "lat": 10.24, "lon": 106.38, "river_branch": "Tien",     "distance_to_sea_km": 50, "elevation_m": 1.1},
>     {"station_id": "BT02", "station_name": "BaTri",   "province": "BenTre",    "lat": 10.07, "lon": 106.58, "river_branch": "Coastal",  "distance_to_sea_km": 15, "elevation_m": 0.6},
>     
>     # Sóc Trăng
>     {"station_id": "ST01", "station_name": "SocTrang", "province": "SocTrang",  "lat": 9.60,  "lon": 105.97, "river_branch": "Hau",      "distance_to_sea_km": 55, "elevation_m": 1.0},
>     {"station_id": "ST02", "station_name": "TranDe",  "province": "SocTrang",  "lat": 9.48,  "lon": 106.20, "river_branch": "Coastal",  "distance_to_sea_km": 8,  "elevation_m": 0.4},
>     
>     # Trà Vinh
>     {"station_id": "TV01", "station_name": "TraVinh",  "province": "TraVinh",   "lat": 9.93,  "lon": 106.35, "river_branch": "Coastal",  "distance_to_sea_km": 25, "elevation_m": 0.7},
>     {"station_id": "TV02", "station_name": "CauQuan", "province": "TraVinh",   "lat": 9.85,  "lon": 106.28, "river_branch": "Coastal",  "distance_to_sea_km": 30, "elevation_m": 0.8},
>     
>     # Bạc Liêu
>     {"station_id": "BL01", "station_name": "BacLieu",  "province": "BacLieu",   "lat": 9.29,  "lon": 105.72, "river_branch": "Coastal",  "distance_to_sea_km": 12, "elevation_m": 0.5},
>     
>     # Cà Mau
>     {"station_id": "CM01", "station_name": "CaMau",    "province": "CaMau",     "lat": 9.18,  "lon": 105.15, "river_branch": "Coastal",  "distance_to_sea_km": 18, "elevation_m": 0.4},
>     {"station_id": "CM02", "station_name": "NamCan",  "province": "CaMau",     "lat": 8.75,  "lon": 104.98, "river_branch": "Coastal",  "distance_to_sea_km": 3,  "elevation_m": 0.2},
>     
>     # An Giang (upstream reference)
>     {"station_id": "AG01", "station_name": "ChauDoc",  "province": "AnGiang",   "lat": 10.70, "lon": 105.12, "river_branch": "Hau",      "distance_to_sea_km": 150, "elevation_m": 2.0},
>     {"station_id": "AG02", "station_name": "LongXuyen","province": "AnGiang", "lat": 10.38, "lon": 105.42, "river_branch": "Hau",      "distance_to_sea_km": 120, "elevation_m": 1.8},
> ]
> ```
> 
> ---
> 
> ## 5. Driver simulation (discharge, tide, rainfall, water level)
> 
> Implement:
> 
> ```python
> def simulate_discharge_tc(dates, nino34_series, extreme_years):
>     ...
> 
> def simulate_tide_vungtau(dates):
>     ...
> 
> def simulate_rainfall_mekong(dates, nino34_series, extreme_years):
>     ...
> 
> def simulate_water_level(dates, discharge, tide, rainfall):
>     ...
> ```
> 
> Requirements:
> 
> ### 5.1 Discharge at Tân Châu (calibrated to real-world data)
> 
> - `discharge_TC_m3s` should match historical ranges from Section 3.2:
>   - **Wet season (Aug-Oct)**: 10,000-15,000 m³/s (normal), up to 20,000+ m³/s (La Niña)
>   - **Dry season (Feb-Apr)**: 3,000-5,000 m³/s (normal), 2,000-3,000 m³/s (El Niño)
>   - **Extreme years (2016, 2020)**: Can drop to 1,500-2,000 m³/s during peak dry season
>   - **Annual average**: ~8,000-10,000 m³/s
> 
> Implementation requirements:
> 
> - Base sinusoidal on day-of-year with peak in Sep-Oct (~12,000 m³/s), minimum in Mar-Apr (~3,500 m³/s)
> - **ENSO effect**: 
>   - El Niño (Niño 3.4 > +0.5): Apply 20-40% reduction in dry season (Feb-Apr), 10-20% reduction in wet season
>   - La Niña (Niño 3.4 < -0.5): Apply 10-30% increase in wet season (Aug-Oct)
>   - Formula: `discharge_factor = 1 - alpha * max(0, nino34) * seasonal_weight` where `alpha ~ 0.25-0.35` for dry season
> - **Extreme years multiplier**: Apply `SALINITY_SEVERITY_MULTIPLIERS` from Section 3.1:
>   - During `EXTREME_IMPACT_MONTHS` (Jan-Apr) in extreme years, reduce discharge by additional 30-50%
>   - Example: 2016 dry season should show discharge ~1,500-2,500 m³/s
> - Add realistic Gaussian noise (coefficient of variation ~0.1-0.15)
> - Clip to validated range: **1,200-25,000 m³/s** (minimum recorded ~1,200 m³/s, maximum flood ~25,000 m³/s)
> 
> ### 5.2 Tide at Vũng Tàu (calibrated to real-world data)
> 
> - `tide_vungtau_m` should match characteristics from Section 3.5:
>   - **Spring tide amplitude**: 0.5-0.7 m (peak every ~14-15 days)
>   - **Neap tide amplitude**: 0.2-0.3 m
>   - **Diurnal variation**: ~0.1-0.2 m daily variation
>   - **Seasonal variation**: 
>     - Dry season (Nov-Apr): +0.1-0.2 m higher baseline
>     - Wet season (May-Oct): -0.1-0.2 m lower baseline
>   - **Tidal range**: 1.5-2.5 m between high and low tide
> 
> Implementation:
> 
> - Combine spring-neap cycle (~14.5 days period) with diurnal component (~1 day)
> - Base amplitude: 0.5-0.7 m for spring tides, 0.2-0.3 m for neap tides
> - Add seasonal offset: +0.15 m in dry season months (Nov-Apr), -0.15 m in wet season (May-Oct)
> - Add small Gaussian noise (~0.05 m standard deviation)
> - Ensure realistic daily variation within tidal range
> 
> ### 5.3 Rainfall simulation (calibrated to real-world data)
> 
> - `rainfall_mm` should match patterns from Section 3.6:
>   - **Wet season (May-Oct)**: 
>     - Monthly average: 150-300 mm/month (~5-10 mm/day average)
>     - Peak months (Aug-Sep): 250-350 mm/month (~8-12 mm/day average)
>     - Maximum daily: 50-100 mm/day during storms
>   - **Dry season (Nov-Apr)**: 
>     - Monthly average: 10-50 mm/month (~0.3-1.7 mm/day average)
>     - Lowest months (Feb-Mar): 5-20 mm/month (~0.2-0.7 mm/day average)
>     - Many days with 0 mm rainfall
> 
> Implementation requirements:
> 
> - Strong seasonality with peak in Aug-Sep (~10 mm/day average), minimum in Feb-Mar (~0.5 mm/day average)
> - **ENSO effect**:
>   - El Niño (Niño 3.4 > +0.5): 20-40% reduction in dry season rainfall, delayed wet season onset by 2-4 weeks
>   - La Niña (Niño 3.4 < -0.5): 10-30% increase in wet season rainfall
> - **Spatial variation**: 
>   - Coastal areas (distance_to_sea_km < 30): Apply 20-30% reduction factor
>   - Inland areas (distance_to_sea_km > 60): Apply 10-20% increase factor
>   - Formula: `rainfall_factor = 1 - 0.25 * min(distance_to_sea_km / 100, 1.0)` for coastal reduction
> - Use gamma distribution or log-normal for daily rainfall (many zeros, occasional high values)
> - Clip to realistic range: 0-100 mm/day (extreme storms), but most days <20 mm/day in wet season
> 
> ### 5.4 Water level simulation
> 
> - `water_level_m` should combine:
>   - Discharge effect (higher discharge → higher water level)
>   - Tide effect (high tide → higher water level)
>   - Rainfall effect (recent rainfall → slight increase)
>   - Base elevation for each station
>   - Formula: `water_level = base_elevation + alpha*discharge_norm + beta*tide + gamma*rainfall_7d_avg`
>   - Typical range: 0.5–3.0 m above sea level
> 
> ---
> 
> ## 6. Salinity simulation per station
> 
> Implement:
> 
> ```python
> def simulate_station_salinity(
>     distance_to_sea_km,
>     elevation_m,
>     discharge_tc,
>     tide,
>     rainfall,
>     water_level,
>     nino34,
>     dates,
>     extreme_years,
> ):
>     ...
> ```
> 
> Requirements:
> 
> - Salinity should be higher:
>   - Closer to the sea (smaller `distance_to_sea_km`).  
>   - When discharge is low.  
>   - When tide is high (especially during dry season).  
>   - When rainfall is low (dry season).
>   - When water level is low.
>   - In ENSO El Niño years, especially in dry season months (Jan–Apr).  
> 
> - Salinity should be lower:
>   - Further inland (larger distance).  
>   - At higher elevation.  
>   - In La Niña / high-flow years.  
>   - During wet season with high rainfall.
>   - When water level is high.
> 
> Suggested enhanced formula:
> 
> ```python
> # distance factor decays exponentially with distance to sea
> dist_factor = np.exp(-distance_to_sea_km / L)     # L around 60–100 km
> 
> # normalize discharge
> Q_norm = (discharge_tc - discharge_tc.mean()) / discharge_tc.std()
> 
> # normalize water level
> WL_norm = (water_level - water_level.mean()) / water_level.std()
> 
> # rainfall effect (inverse relationship)
> rainfall_factor = 1 / (1 + rainfall / 10)  # more rain → less salinity
> 
> # smooth ENSO over 30 days
> nino_smooth = pd.Series(nino34).rolling(30, min_periods=1).mean().values
> 
> # base salinity (in g/L, convert to ppt by dividing by 1.0)
> salinity_gL = (
>     A0 * dist_factor
>     + A1 * tide
>     - A2 * Q_norm
>     - A3 * WL_norm
>     - A4 * rainfall_factor
>     + A5 * nino_smooth
>     - A6 * elevation_m
> )
> 
> # increase salinity in extreme years (2016, 2020, etc.)
> mask_extreme = np.isin(dates.year, extreme_years)
> salinity_gL[mask_extreme] += delta_extreme   # e.g. +1 to +3 g/L
> 
> # add noise and clip at zero
> salinity_gL += np.random.normal(scale=sigma, size=len(salinity_gL))
> salinity_gL = np.clip(salinity_gL, 0, None)
> 
> # Convert to ppt (parts per thousand) - 1 g/L ≈ 1 ppt for seawater
> salinity_ppt = salinity_gL
> ```
> 
> - Choose coefficients so typical salinity ranges match real-world observations:
>   - **Estuary stations** (Cua_Tieu/Cua_Dai, distance_to_sea_km < 20): 
>     - Normal dry season: 5-15 ppt
>     - Extreme dry season (2016, 2020): 15-25 ppt, can reach 30+ ppt
>   - **Mid-distance stations** (MyTho/CaiBe, distance_to_sea_km 50-90):
>     - Normal dry season: 0-5 ppt
>     - Extreme dry season: 5-15 ppt, can exceed 4 ppt critical threshold
>   - **Inland stations** (ChauDoc/LongXuyen, distance_to_sea_km > 120):
>     - Normal: <1 ppt year-round
>     - Extreme years: 1-4 ppt during peak dry season
>   - **Coastal stations** (RachGia/HaTien, distance_to_sea_km < 10):
>     - Can reach 25-35 ppt during extreme dry seasons
>     - Show high variability with tide cycles
> 
> - Ensure that during extreme years (2016, 2020) in dry season months (Jan-Apr):
>   - Salinity exceeds 4 ppt threshold at stations 50-70 km from coast
>   - Salinity exceeds 1 ppt threshold at stations 80-100 km from coast
>   - This matches historical records of 70-90 km intrusion distance
> 
> ---
> 
> ## 7. Generate salinity boundaries (1‰ and 4‰ thresholds)
> 
> Implement:
> 
> ```python
> def generate_salinity_boundaries(stations_df, dates, salinity_field='salinity_ppt'):
>     ...
> ```
> 
> Requirements:
> 
> - For each date, create **Polygon boundaries** representing where salinity exceeds 1‰ and 4‰
> - Use spatial interpolation (inverse distance weighting or kriging) from station data
> - Generate boundaries as:
>   - **Convex hull** or **contour lines** around stations with salinity >= threshold
>   - Or use **grid interpolation** then extract contours
> - Output format: GeoJSON FeatureCollection with:
>   ```json
>   {
>     "type": "FeatureCollection",
>     "features": [
>       {
>         "type": "Feature",
>         "geometry": {
>           "type": "Polygon",
>           "coordinates": [[[lon, lat], ...]]
>         },
>         "properties": {
>           "date": "YYYY-MM-DD",
>           "salinity": 1.0,  // or 4.0
>           "confidence": 0.85
>         }
>       }
>     ]
>   }
>   ```
> - Save daily files: `salinity_boundaries_geojson/boundaries_YYYY-MM-DD.geojson`
> - Boundaries should:
>   - Extend from coast inland
>   - Respect station locations and measured values
>   - Have realistic shapes (not perfect circles)
> - Use Shapely for geometry operations, GeoPandas for spatial data handling
> 
> ---
> 
> ## 8. Calculate risk surface
> 
> Implement:
> 
> ```python
> def calculate_risk_surface(stations_df, dates, grid_resolution=0.05):
>     ...
> ```
> 
> Requirements:
> 
> - Create a **spatial grid** covering Mekong Delta (approx. lat: 8.5-10.5, lon: 104.5-106.5)
> - For each grid point and date, calculate:
>   - **Risk score (0-100)** based on:
>     - Salinity intensity (higher salinity → higher risk)
>     - Duration of exposure (how many consecutive days above threshold)
>     - Proximity to critical thresholds (1‰, 4‰)
>   - Interpolated salinity values (1‰ and 4‰ thresholds)
>   - Confidence score (based on distance to nearest station)
> 
> Risk score formula:
> ```python
> # Base risk from salinity intensity
> if salinity >= 4.0:
>     intensity_risk = 75 + (salinity - 4.0) * 5  # 75-100 for 4+ ppt
> elif salinity >= 1.0:
>     intensity_risk = 25 + (salinity - 1.0) * 16.67  # 25-75 for 1-4 ppt
> else:
>     intensity_risk = salinity * 25  # 0-25 for <1 ppt
> 
> # Duration penalty (consecutive days above 1‰)
> duration_penalty = min(consecutive_days_above_1ppt * 2, 20)
> 
> # Final risk score
> risk_score = min(intensity_risk + duration_penalty, 100)
> ```
> 
> - Output CSV: `risk_surface_daily.csv` with columns:
>   ```text
>   date, lat, lon, risk_score, salinity_1ppt, salinity_4ppt, confidence, nearest_station_id, nearest_station_distance_km
>   ```
> 
> ---
> 
> ## 9. Build the full DataFrame and lag features
> 
> For all stations:
> 
> - Create a DataFrame with columns:
> 
> ```text
> station_id
> station_name
> province
> lat
> lon
> river_branch
> distance_to_sea_km
> elevation_m
> date
> year
> month
> day_of_year
> salinity_ppt
> salinity_gL
> discharge_TC_m3s
> tide_vungtau_m
> rainfall_mm
> water_level_m
> nino34_anom
> ```
> 
> - Then **sort** by `station_id, date`.  
> - Add lag features:
> 
> ```python
> for lag in [1, 7, 14, 30, 60]:
>     df[f"salinity_lag_{lag}d"] = df.groupby("station_id")["salinity_ppt"].shift(lag)
>     df[f"discharge_lag_{lag}d"] = df.groupby("station_id")["discharge_TC_m3s"].shift(lag)
>     df[f"tide_lag_{lag}d"] = df.groupby("station_id")["tide_vungtau_m"].shift(lag)
> ```
> 
> - Add spatial features:
>   - Distance to nearest station
>   - Average salinity of neighboring stations (within 50km radius)
>   - Spatial lag features
> 
> - Drop initial rows where lags are NaN if desired (or keep and let the model handle).  
> - Save to `mekong_delta_salinity_stations.csv`, UTF‑8, comma‑separated.
> 
> ---
> 
> ## 10. Code quality and output validation
> 
> - Use functions and `main()`; avoid hardcoding in global scope.  
> - Log basic info (print shapes, date ranges, min/max salinity, number of stations) to sanity-check realism.  
> - Validate outputs:
>   - Check that salinity values are in reasonable ranges (0-35 ppt)
>   - Verify boundaries are valid polygons
>   - Ensure risk scores are 0-100
>   - Check that GeoJSON files are valid
> - If external HTTP calls fail (ENSO, news pages), do not crash: fall back to:
>   - local ENSO file if exists; otherwise, simulate an ENSO series.  
>   - fixed `SALINITY_EXTREME_YEARS` list.  
> 
> The final script should be immediately runnable and produce all output files in the current working directory.
