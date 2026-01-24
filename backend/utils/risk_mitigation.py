"""Risk mitigation utilities for salinity management."""

import numpy as np
from typing import Dict, List, Optional
from datetime import datetime, timedelta


def calculate_harvest_deadline(
    forecasted_salinity: List[float],
    critical_threshold: float = 4.0,
    harvest_duration_days: int = 3
) -> Optional[Dict[str, any]]:
    """
    Calculate harvest deadline based on salinity forecast.
    
    Returns:
        - deadline_date: Date by which harvest must be completed
        - urgency: 'urgent', 'high', 'medium', 'low'
        - days_until_critical: Days until salinity exceeds critical threshold
    """
    if not forecasted_salinity:
        return None
    
    # Find first day when salinity exceeds critical threshold
    days_until_critical = len(forecasted_salinity)
    for i, salinity in enumerate(forecasted_salinity):
        if salinity >= critical_threshold:
            days_until_critical = i
            break
    
    if days_until_critical >= len(forecasted_salinity):
        # No critical threshold exceeded in forecast period
        return {
            'deadline_date': None,
            'urgency': 'low',
            'days_until_critical': days_until_critical,
            'message': 'No critical salinity threshold expected in forecast period.'
        }
    
    # Deadline is before critical threshold (account for harvest duration)
    deadline_days = max(1, days_until_critical - harvest_duration_days)
    deadline_date = (datetime.now() + timedelta(days=deadline_days)).strftime('%Y-%m-%d')
    
    # Determine urgency
    if days_until_critical <= 3:
        urgency = 'urgent'
    elif days_until_critical <= 7:
        urgency = 'high'
    elif days_until_critical <= 14:
        urgency = 'medium'
    else:
        urgency = 'low'
    
    return {
        'deadline_date': deadline_date,
        'urgency': urgency,
        'days_until_critical': days_until_critical,
        'message': f'Complete harvest by {deadline_date} to avoid critical salinity levels.'
    }


def generate_mitigation_recommendations(
    current_salinity: float,
    forecasted_salinity: List[float],
    risk_score: float,
    station_id: str
) -> List[Dict[str, any]]:
    """
    Generate risk mitigation recommendations based on current and forecasted conditions.
    
    Returns list of recommendations with priority, action, and deadline.
    """
    recommendations = []
    
    # Check for critical salinity
    if current_salinity >= 4.0:
        recommendations.append({
            'priority': 'urgent',
            'category': 'harvest',
            'action': 'immediate_harvest',
            'title': 'Critical Salinity Detected',
            'message': f'Current salinity ({current_salinity:.1f}‰) exceeds critical threshold. Begin harvest immediately.',
            'deadline': datetime.now().strftime('%Y-%m-%d'),
            'icon': 'alert-triangle'
        })
    
    # Check forecast for critical periods
    harvest_deadline = calculate_harvest_deadline(forecasted_salinity, critical_threshold=4.0)
    if harvest_deadline and harvest_deadline['deadline_date']:
        recommendations.append({
            'priority': harvest_deadline['urgency'],
            'category': 'harvest',
            'action': 'plan_harvest',
            'title': 'Harvest Deadline',
            'message': harvest_deadline['message'],
            'deadline': harvest_deadline['deadline_date'],
            'icon': 'calendar'
        })
    
    # Check for moderate salinity (1-4‰)
    if 1.0 <= current_salinity < 4.0:
        recommendations.append({
            'priority': 'medium',
            'category': 'storage',
            'action': 'fill_reservoirs',
            'title': 'Fill Reservoirs',
            'message': 'Salinity is moderate. Fill reservoirs while water quality is still acceptable.',
            'deadline': (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d'),
            'icon': 'droplet'
        })
    
    # High risk score recommendations
    if risk_score >= 75:
        recommendations.append({
            'priority': 'urgent',
            'category': 'mitigation',
            'action': 'reduce_exposure',
            'title': 'High Risk Detected',
            'message': f'Risk score is {risk_score:.0f}/100. Implement water-saving measures and prepare alternative water sources.',
            'deadline': (datetime.now() + timedelta(days=3)).strftime('%Y-%m-%d'),
            'icon': 'shield-alert'
        })
    elif risk_score >= 50:
        recommendations.append({
            'priority': 'high',
            'category': 'mitigation',
            'action': 'monitor_closely',
            'title': 'Elevated Risk',
            'message': f'Risk score is {risk_score:.0f}/100. Monitor salinity levels closely and prepare mitigation plans.',
            'deadline': None,
            'icon': 'eye'
        })
    
    # Check for safe window for operations
    safe_window = find_safe_operational_window(forecasted_salinity, safe_threshold=1.0)
    if safe_window:
        recommendations.append({
            'priority': 'low',
            'category': 'planning',
            'action': 'optimal_sowing',
            'title': 'Optimal Sowing Window',
            'message': f'Salinity expected to be low from {safe_window["start_date"]} to {safe_window["end_date"]}. Ideal time for sowing.',
            'deadline': safe_window['start_date'],
            'icon': 'calendar-check'
        })
    
    return recommendations


def find_safe_operational_window(
    forecasted_salinity: List[float],
    safe_threshold: float = 1.0,
    min_window_days: int = 5
) -> Optional[Dict[str, str]]:
    """
    Find safe operational window when salinity is below threshold.
    
    Returns start and end dates of safe window if found.
    """
    if not forecasted_salinity:
        return None
    
    safe_periods = []
    start_idx = None
    
    for i, salinity in enumerate(forecasted_salinity):
        if salinity < safe_threshold:
            if start_idx is None:
                start_idx = i
        else:
            if start_idx is not None:
                duration = i - start_idx
                if duration >= min_window_days:
                    safe_periods.append({
                        'start_idx': start_idx,
                        'end_idx': i - 1,
                        'duration': duration
                    })
                start_idx = None
    
    # Check if last period extends to end
    if start_idx is not None:
        duration = len(forecasted_salinity) - start_idx
        if duration >= min_window_days:
            safe_periods.append({
                'start_idx': start_idx,
                'end_idx': len(forecasted_salinity) - 1,
                'duration': duration
            })
    
    if not safe_periods:
        return None
    
    # Return longest safe period
    best_period = max(safe_periods, key=lambda x: x['duration'])
    
    start_date = (datetime.now() + timedelta(days=best_period['start_idx'])).strftime('%Y-%m-%d')
    end_date = (datetime.now() + timedelta(days=best_period['end_idx'])).strftime('%Y-%m-%d')
    
    return {
        'start_date': start_date,
        'end_date': end_date,
        'duration_days': best_period['duration']
    }


def calculate_mitigation_effectiveness(
    current_risk: float,
    forecasted_risk: List[float],
    mitigation_action: str
) -> Dict[str, any]:
    """
    Calculate effectiveness of mitigation actions.
    
    Args:
        current_risk: Current risk score
        forecasted_risk: List of forecasted risk scores
        mitigation_action: Type of mitigation ('harvest', 'storage', 'reduce_consumption')
    
    Returns:
        - risk_reduction: Expected risk reduction
        - effectiveness_score: 0-100 score
    """
    if not forecasted_risk:
        return {
            'risk_reduction': 0.0,
            'effectiveness_score': 0.0
        }
    
    avg_forecasted_risk = np.mean(forecasted_risk)
    
    # Estimate risk reduction based on action type
    reduction_factors = {
        'harvest': 0.8,  # Harvest reduces exposure by 80%
        'storage': 0.6,  # Storage reduces dependency by 60%
        'reduce_consumption': 0.4  # Reducing consumption helps but less effective
    }
    
    reduction_factor = reduction_factors.get(mitigation_action, 0.3)
    risk_reduction = avg_forecasted_risk * reduction_factor
    effectiveness_score = min(100, risk_reduction / avg_forecasted_risk * 100) if avg_forecasted_risk > 0 else 0
    
    return {
        'risk_reduction': float(risk_reduction),
        'effectiveness_score': float(effectiveness_score),
        'mitigation_action': mitigation_action
    }
