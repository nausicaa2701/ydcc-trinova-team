import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime, timedelta


# Input daily dataset and output simulated realtime dataset
DAILY_CSV_PATH = Path("dataset/station_data_daily.csv")
# This realtime dataset is enriched with all original daily features
# so that backend models still have ENSO, tide, lag features, etc.
OUTPUT_CSV_PATH = Path("dataset/station_data_realtime.csv")

# --- Simulation config ---
# Step of "real-time" data (minutes)
FREQUENCY_MINUTES = 30  # 30 min -> 48 samples / day

# Columns we will produce (real-time core fields + original daily features)
CORE_COLUMNS = [
    "station_id",
    "station_name",
    "date",
    "time",
    "distance_to_sea_km",
    "elevation_m",
    "salinity_ppt",        # used by models
    "water_level_m",       # used by models
    "discharge_TC_m3s",
    "tide_vungtau_m",
    "rainfall_mm",
    "nino34_anom",
    "salinity_lag_1d",
    "salinity_lag_7d",
    "salinity_lag_14d",
    "discharge_lag_1d",
    "discharge_lag_7d",
    "discharge_lag_14d",
    "tide_lag_1d",
    "tide_lag_7d",
    "tide_lag_14d",
    "month",
    "day_of_year",
    # extra real-time / physical fields
    "temperature",
    "ec",
    "do",
]


def load_daily_data(path: Path) -> pd.DataFrame:
    """Load daily station data."""
    df = pd.read_csv(path)

    # Ensure date column is datetime
    if not np.issubdtype(df["date"].dtype, np.datetime64):
        df["date"] = pd.to_datetime(df["date"])

    return df


def simulate_realtime_for_day(row: pd.Series, freq_min: int) -> list[dict]:
    """
    From one daily record, simulate intra-day "real-time" series using Gaussian noise.

    We mainly use:
    - salinity_ppt as the base mean for salinity
    - water_level_m as the base mean for water_level
    - distance_to_sea_km for distance_km
    Other variables (temperature, ec, do) are simulated with simple relationships.
    """
    n_steps = int(24 * 60 / freq_min)

    # Start from 00:00 of that date
    day_date: pd.Timestamp = row["date"]
    start_dt = datetime(day_date.year, day_date.month, day_date.day, 0, 0)
    times = [start_dt + timedelta(minutes=freq_min * i) for i in range(n_steps)]

    # Base means from daily data
    salinity_daily = float(row.get("salinity_ppt", np.nan))
    if np.isnan(salinity_daily):
        salinity_daily = 5.0  # fallback

    water_level_daily = float(row.get("water_level_m", np.nan))
    if np.isnan(water_level_daily):
        water_level_daily = 0.0

    distance_km = float(row.get("distance_to_sea_km", np.nan))
    station_id = row.get("station_id", "")
    station_name = row.get("station_name", "")

    # Salinity parameters
    salinity_mean = salinity_daily
    salinity_std = max(0.1 * salinity_daily, 0.3)

    # Simple intra-day sinusoid (e.g. tidal influence)
    phases = np.linspace(0, 2 * np.pi, n_steps, endpoint=False)
    diurnal_factor = 1.0 + 0.15 * np.sin(phases)  # ±15 %

    records: list[dict] = []
    for i, ts in enumerate(times):
        # --- salinity (ppt) ---
        salinity = np.random.normal(salinity_mean, salinity_std)
        salinity *= diurnal_factor[i]
        salinity = float(np.clip(salinity, 0.0, 45.0))

        # --- EC (mS/cm), roughly proportional to salinity ---
        ec_mean = 1.6 * salinity
        ec = np.random.normal(ec_mean, 0.15 * max(ec_mean, 1.0))
        ec = float(max(ec, 0.0))

        # --- temperature (°C), slightly depending on month ---
        month = int(row.get("month", ts.month))
        # crude seasonal pattern: a bit warmer in Mar–May, cooler end of year
        base_temp_by_month = {
            1: 28.5,
            2: 29.0,
            3: 30.0,
            4: 30.5,
            5: 30.5,
            6: 29.5,
            7: 29.0,
            8: 29.0,
            9: 29.0,
            10: 28.5,
            11: 28.0,
            12: 28.0,
        }
        temp_base = base_temp_by_month.get(month, 29.0)
        temp = float(np.random.normal(temp_base, 0.8))

        # --- water level (m), perturb daily mean + sinusoid ---
        wl_base = water_level_daily
        wl_amp = max(0.2 * abs(wl_base), 0.05)
        wl = float(
            wl_base
            + wl_amp * np.sin(2 * np.pi * i / (24 * 60 / freq_min))
            + np.random.normal(0, 0.03)
        )

        # --- DO (mg/L), weakly decreasing with salinity ---
        do_mean = 7.5 - 0.04 * salinity
        do = float(np.random.normal(do_mean, 0.5))
        do = float(np.clip(do, 0.5, 12.0))

        record = {
            "station_id": station_id,
            "station_name": station_name,
            "date": ts.strftime("%Y-%m-%d"),
            "time": ts.strftime("%H:%M:%S"),
            "distance_to_sea_km": distance_km,
            "elevation_m": float(row.get("elevation_m", 0.0)),
            # real-time salinity and water level override daily means
            "salinity_ppt": round(salinity, 2),
            "water_level_m": round(wl, 3),
            # keep original large-scale drivers / lags unchanged within the day
            "discharge_TC_m3s": float(row.get("discharge_TC_m3s", 0.0)),
            "tide_vungtau_m": float(row.get("tide_vungtau_m", 0.0)),
            "rainfall_mm": float(row.get("rainfall_mm", 0.0)),
            "nino34_anom": float(row.get("nino34_anom", 0.0)),
            "salinity_lag_1d": float(row.get("salinity_lag_1d", 0.0)),
            "salinity_lag_7d": float(row.get("salinity_lag_7d", 0.0)),
            "salinity_lag_14d": float(row.get("salinity_lag_14d", 0.0)),
            "discharge_lag_1d": float(row.get("discharge_lag_1d", 0.0)),
            "discharge_lag_7d": float(row.get("discharge_lag_7d", 0.0)),
            "discharge_lag_14d": float(row.get("discharge_lag_14d", 0.0)),
            "tide_lag_1d": float(row.get("tide_lag_1d", 0.0)),
            "tide_lag_7d": float(row.get("tide_lag_7d", 0.0)),
            "tide_lag_14d": float(row.get("tide_lag_14d", 0.0)),
            "month": int(row.get("month", ts.month)),
            "day_of_year": int(row.get("day_of_year", ts.timetuple().tm_yday)),
            # extra real-time physical variables
            "temperature": round(temp, 2),
            "ec": round(ec, 2),
            "do": round(do, 2),
        }

        records.append(record)

    return records


def main():
    df_daily = load_daily_data(DAILY_CSV_PATH)

    all_records: list[dict] = []
    for _, row in df_daily.iterrows():
        all_records.extend(simulate_realtime_for_day(row, FREQUENCY_MINUTES))

    df_out = pd.DataFrame(all_records)
    # Ensure column order (non-existing ones will be added if missing)
    for col in CORE_COLUMNS:
        if col not in df_out.columns:
            df_out[col] = 0.0
    df_out = df_out[CORE_COLUMNS]
    OUTPUT_CSV_PATH.parent.mkdir(parents=True, exist_ok=True)
    df_out.to_csv(OUTPUT_CSV_PATH, index=False, encoding="utf-8")

    print(f"Saved {len(df_out)} rows to {OUTPUT_CSV_PATH}")


if __name__ == "__main__":
    main()

