import json
import uuid
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
from pathlib import Path

DATA_PATH = Path("extracted_data/station_data_extracted.json")
OUTPUT_PATH = Path("extracted_data/simulated_realtime_salinity.csv")

# --- Config ---
FREQUENCY_MINUTES = 30          # real-time resolution
SIMULATION_HOURS = 24           # how long to simulate
START_DATETIME = datetime(2026, 1, 1, 0, 0)  # arbitrary start

def load_station_metadata(path: Path):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    # Build station-level metadata (one row per station_name + distance_km)
    stations = {}
    for row in data:
        key = (row["station_name"], row["distance_km"])
        if key not in stations:
            stations[key] = {
                "station_id": str(uuid.uuid4()),
                "station_name": row["station_name"],
                "distance_km": row["distance_km"],
                "smax_observed": row.get("smax_observed"),
                "smax_forecast": row.get("smax_forecast"),
            }
        else:
            # Optionally update smax_observed with mean over periods
            s_old = stations[key]["smax_observed"]
            s_new = row.get("smax_observed")
            if s_old is not None and s_new is not None:
                stations[key]["smax_observed"] = (s_old + s_new) / 2
    return list(stations.values())

def simulate_for_station(station, start_dt, hours, freq_min):
    n_steps = int(hours * 60 / freq_min)
    times = [start_dt + timedelta(minutes=freq_min * i) for i in range(n_steps)]

    smax = station["smax_observed"] if station["smax_observed"] is not None else 5.0
    # Treat smax as an upper envelope, typical mean ~ 0.8*smax
    salinity_mean = 0.8 * smax
    salinity_std = max(0.2 * smax, 0.5)

    # Simple diurnal modulation (stronger salinity at some time of day)
    phases = np.linspace(0, 2 * np.pi, n_steps, endpoint=False)
    diurnal_factor = 1.0 + 0.1 * np.sin(phases)  # ±10 %

    records = []
    for i, ts in enumerate(times):
        # --- salinity (‰) ---
        salinity = np.random.normal(salinity_mean, salinity_std)
        salinity *= diurnal_factor[i]
        salinity = float(np.clip(salinity, 0.0, max(40.0, smax + 5.0)))

        # --- EC (mS/cm), simply proportional to salinity ---
        ec_mean = 1.6 * salinity  # rough factor, domain-specific
        ec = np.random.normal(ec_mean, 0.1 * max(ec_mean, 1.0))
        ec = float(max(ec, 0.0))

        # --- temperature (°C) ---
        temp = float(np.random.normal(30.0, 1.0))  # tweak by month/season if needed

        # --- water level (m) with simple tide-like sinusoid ---
        wl_base = 1.5  # station-specific base could be used
        wl_amp = 0.5   # amplitude
        wl = float(wl_base + wl_amp * np.sin(2 * np.pi * i / (24 * 60 / freq_min)) +
                   np.random.normal(0, 0.05))

        # --- DO (mg/L), weakly decreasing with salinity ---
        do_mean = 7.5 - 0.05 * salinity
        do = float(np.random.normal(do_mean, 0.5))
        do = float(np.clip(do, 0.5, 12.0))

        records.append({
            "station_id": station["station_id"],
            "station_name": station["station_name"],
            "distance_km": station["distance_km"],
            "temperature": round(temp, 2),
            "water_level": round(wl, 3),
            "ec": round(ec, 2),
            "salinity": round(salinity, 2),
            "do": round(do, 2),
            "time": ts.strftime("%H:%M:%S"),
            "date": ts.strftime("%Y-%m-%d"),
        })
    return records

def main():
    stations = load_station_metadata(DATA_PATH)
    all_records = []
    for st in stations:
        all_records.extend(
            simulate_for_station(st, START_DATETIME, SIMULATION_HOURS, FREQUENCY_MINUTES)
        )

    df = pd.DataFrame(all_records)
    df.to_csv(OUTPUT_PATH, index=False, encoding="utf-8")
    print(f"Saved {len(df)} rows to {OUTPUT_PATH}")

if __name__ == "__main__":
    main()