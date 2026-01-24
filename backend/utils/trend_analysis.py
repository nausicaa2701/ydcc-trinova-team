"""Trend analysis utilities for salinity forecasting."""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta
from scipy import stats
from sklearn.linear_model import LinearRegression


def calculate_trend(
    values: np.ndarray,
    dates: pd.DatetimeIndex
) -> Dict[str, float]:
    """
    Calculate trend statistics for a time series.
    
    Returns:
        - slope: Linear regression slope (change per day)
        - trend_direction: 'increasing', 'decreasing', 'stable'
        - trend_strength: R-squared value (0-1)
        - p_value: Statistical significance
    """
    if len(values) < 2:
        return {
            'slope': 0.0,
            'trend_direction': 'stable',
            'trend_strength': 0.0,
            'p_value': 1.0
        }
    
    # Convert dates to numeric (days since start)
    x = np.arange(len(values))
    
    # Linear regression
    slope, intercept, r_value, p_value, std_err = stats.linregress(x, values)
    
    # Determine trend direction
    if abs(slope) < 0.01:
        direction = 'stable'
    elif slope > 0:
        direction = 'increasing'
    else:
        direction = 'decreasing'
    
    return {
        'slope': float(slope),
        'trend_direction': direction,
        'trend_strength': float(r_value ** 2),  # R-squared
        'p_value': float(p_value),
        'intercept': float(intercept)
    }


def analyze_seasonal_pattern(
    df: pd.DataFrame,
    station_id: str,
    date_col: str = 'date',
    salinity_col: str = 'salinity_ppt'
) -> Dict[str, any]:
    """
    Analyze seasonal patterns in salinity data.
    
    Returns:
        - monthly_avg: Average salinity by month
        - seasonal_trend: Overall seasonal pattern
        - peak_month: Month with highest salinity
        - low_month: Month with lowest salinity
    """
    station_df = df[df['station_id'] == station_id].copy()
    if len(station_df) == 0:
        return {}
    
    station_df[date_col] = pd.to_datetime(station_df[date_col])
    station_df['month'] = station_df[date_col].dt.month
    
    monthly_avg = station_df.groupby('month')[salinity_col].mean().to_dict()
    
    if monthly_avg:
        peak_month = max(monthly_avg, key=monthly_avg.get)
        low_month = min(monthly_avg, key=monthly_avg.get)
    else:
        peak_month = None
        low_month = None
    
    return {
        'monthly_average': monthly_avg,
        'peak_month': int(peak_month) if peak_month else None,
        'low_month': int(low_month) if low_month else None,
        'seasonal_range': float(max(monthly_avg.values()) - min(monthly_avg.values())) if monthly_avg else 0.0
    }


def forecast_trend(
    historical_values: np.ndarray,
    forecast_days: int = 30
) -> Dict[str, any]:
    """
    Forecast future trend based on historical data.
    
    Returns:
        - forecast_values: Predicted values for next N days
        - confidence_interval: Upper and lower bounds
    """
    if len(historical_values) < 7:
        # Not enough data, return flat forecast
        return {
            'forecast_values': [historical_values[-1] if len(historical_values) > 0 else 0.0] * forecast_days,
            'confidence_upper': [],
            'confidence_lower': []
        }
    
    x = np.arange(len(historical_values))
    x_future = np.arange(len(historical_values), len(historical_values) + forecast_days)
    
    # Linear regression
    slope, intercept, r_value, p_value, std_err = stats.linregress(x, historical_values)
    
    # Forecast
    forecast = intercept + slope * x_future
    
    # Simple confidence interval (±2 std_err)
    confidence_upper = forecast + 2 * std_err
    confidence_lower = forecast - 2 * std_err
    
    return {
        'forecast_values': forecast.tolist(),
        'confidence_upper': confidence_upper.tolist(),
        'confidence_lower': confidence_lower.tolist(),
        'slope': float(slope),
        'r_squared': float(r_value ** 2)
    }


def compare_periods(
    current_values: np.ndarray,
    previous_values: np.ndarray
) -> Dict[str, any]:
    """
    Compare current period with previous period.
    
    Returns:
        - change_percent: Percentage change
        - change_absolute: Absolute change
        - is_worse: Boolean indicating if situation worsened
    """
    if len(current_values) == 0 or len(previous_values) == 0:
        return {
            'change_percent': 0.0,
            'change_absolute': 0.0,
            'is_worse': False
        }
    
    current_avg = np.mean(current_values)
    previous_avg = np.mean(previous_values)
    
    if previous_avg == 0:
        change_percent = 0.0
    else:
        change_percent = ((current_avg - previous_avg) / previous_avg) * 100
    
    change_absolute = current_avg - previous_avg
    
    # For salinity, higher is worse
    is_worse = current_avg > previous_avg
    
    return {
        'change_percent': float(change_percent),
        'change_absolute': float(change_absolute),
        'is_worse': bool(is_worse),
        'current_average': float(current_avg),
        'previous_average': float(previous_avg)
    }
