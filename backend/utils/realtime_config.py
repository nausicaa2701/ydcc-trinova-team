"""Shared configuration for real-time salinity models (30-minute step)."""

# Time resolution for real-time model (minutes per step)
REALTIME_STEP_MINUTES: int = 30

# How many past steps to use as history (e.g. 48 = last 24h)
REALTIME_SEQ_LENGTH: int = 48

# How many future steps to forecast (e.g. 48 = next 24h)
REALTIME_HORIZON_STEPS: int = 48

