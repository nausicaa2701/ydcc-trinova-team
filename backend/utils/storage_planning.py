"""Storage planning utilities for water reservoir management."""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta


def calculate_days_of_supply(
    current_level_percent: float,
    daily_consumption_rate: float,
    total_capacity: float,
    forecasted_salinity: List[float],
    safe_salinity_threshold: float = 1.0
) -> Dict[str, any]:
    """
    Calculate days of supply remaining based on current level and forecast.
    
    Args:
        current_level_percent: Current reservoir level (0-100)
        daily_consumption_rate: Daily water consumption (m3/day)
        total_capacity: Total reservoir capacity (m3)
        forecasted_salinity: List of forecasted salinity values
        safe_salinity_threshold: Salinity threshold above which water is unsafe
    
    Returns:
        - days_remaining: Days until reservoir is empty
        - shortfall_date: Date when reservoir will be empty
        - safe_window_days: Days until salinity exceeds safe threshold
        - recommendations: List of recommendations
    """
    current_volume = (current_level_percent / 100.0) * total_capacity
    
    if daily_consumption_rate <= 0:
        return {
            'days_remaining': 999,
            'shortfall_date': None,
            'safe_window_days': len(forecasted_salinity),
            'recommendations': []
        }
    
    # Days until empty
    days_remaining = int(current_volume / daily_consumption_rate)
    
    # Calculate shortfall date
    shortfall_date = (datetime.now() + timedelta(days=days_remaining)).isoformat()
    
    # Find when salinity exceeds safe threshold
    safe_window_days = len(forecasted_salinity)
    for i, salinity in enumerate(forecasted_salinity):
        if salinity >= safe_salinity_threshold:
            safe_window_days = i
            break
    
    # Generate recommendations
    recommendations = []
    
    if days_remaining < 14:
        recommendations.append({
            'priority': 'urgent',
            'action': 'fill_reservoirs',
            'message': f'Reservoir will be empty in {days_remaining} days. Fill immediately.',
            'deadline': (datetime.now() + timedelta(days=max(1, days_remaining - 3))).strftime('%Y-%m-%d')
        })
    elif days_remaining < 30:
        recommendations.append({
            'priority': 'high',
            'action': 'fill_reservoirs',
            'message': f'Fill reservoirs within {days_remaining - 7} days to ensure supply.',
            'deadline': (datetime.now() + timedelta(days=days_remaining - 7)).strftime('%Y-%m-%d')
        })
    
    if safe_window_days < 7:
        recommendations.append({
            'priority': 'urgent',
            'action': 'harvest',
            'message': f'Salinity will exceed safe threshold in {safe_window_days} days. Complete harvest before then.',
            'deadline': (datetime.now() + timedelta(days=max(1, safe_window_days - 2))).strftime('%Y-%m-%d')
        })
    elif safe_window_days < 14:
        recommendations.append({
            'priority': 'high',
            'action': 'harvest',
            'message': f'Plan to complete harvest within {safe_window_days} days.',
            'deadline': (datetime.now() + timedelta(days=safe_window_days - 3)).strftime('%Y-%m-%d')
        })
    
    return {
        'days_remaining': days_remaining,
        'shortfall_date': shortfall_date,
        'safe_window_days': safe_window_days,
        'current_level_percent': current_level_percent,
        'current_volume_m3': current_volume,
        'recommendations': recommendations
    }


def calculate_optimal_fill_date(
    forecasted_salinity: List[float],
    safe_salinity_threshold: float = 1.0,
    fill_duration_days: int = 3
) -> Optional[str]:
    """
    Calculate optimal date to fill reservoirs based on salinity forecast.
    
    Returns the last date when salinity is below threshold and allows time for filling.
    """
    if not forecasted_salinity:
        return None
    
    # Find last safe window
    last_safe_day = -1
    for i, salinity in enumerate(forecasted_salinity):
        if salinity < safe_salinity_threshold:
            last_safe_day = i
        else:
            break
    
    if last_safe_day < 0:
        return None
    
    # Account for fill duration
    optimal_day = max(0, last_safe_day - fill_duration_days)
    optimal_date = datetime.now() + timedelta(days=optimal_day)
    
    return optimal_date.strftime('%Y-%m-%d')


def estimate_storage_requirements(
    forecasted_salinity: List[float],
    daily_consumption_rate: float,
    safe_salinity_threshold: float = 1.0,
    buffer_days: int = 7
) -> Dict[str, any]:
    """
    Estimate storage requirements based on forecast.
    
    Returns:
        - required_capacity: Required storage capacity (m3)
        - critical_period_days: Number of days when salinity exceeds threshold
        - recommended_fill_date: Recommended date to fill reservoirs
    """
    # Count days above threshold
    critical_days = sum(1 for s in forecasted_salinity if s >= safe_salinity_threshold)
    
    # Required capacity = consumption during critical period + buffer
    total_days_needed = critical_days + buffer_days
    required_capacity = daily_consumption_rate * total_days_needed
    
    # Find optimal fill date
    optimal_fill_date = calculate_optimal_fill_date(forecasted_salinity, safe_salinity_threshold)
    
    return {
        'required_capacity_m3': float(required_capacity),
        'critical_period_days': critical_days,
        'recommended_fill_date': optimal_fill_date,
        'buffer_days': buffer_days
    }
