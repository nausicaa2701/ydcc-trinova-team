"""Risk scoring models for salinity threshold classification."""

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import joblib
from typing import Tuple, Dict


def create_risk_labels(salinity: np.ndarray, threshold_1ppt: float = 1.0, threshold_4ppt: float = 4.0) -> np.ndarray:
    """Create risk labels based on salinity thresholds."""
    labels = np.zeros(len(salinity))
    labels[salinity >= threshold_1ppt] = 1
    labels[salinity >= threshold_4ppt] = 2
    return labels.astype(int)


def prepare_risk_features(
    df: pd.DataFrame,
    include_enso: bool = True,
    include_spatial: bool = True
) -> Tuple[np.ndarray, np.ndarray]:
    """Prepare features for risk scoring."""
    feature_cols = [
        'discharge_TC_m3s',
        'tide_vungtau_m',
        'rainfall_mm',
        'water_level_m',
        'salinity_lag_1d',
        'salinity_lag_7d',
        'discharge_lag_1d',
        'discharge_lag_7d',
        'month',
        'day_of_year',
    ]
    
    if include_enso:
        feature_cols.append('nino34_anom')
    
    if include_spatial:
        feature_cols.extend(['distance_to_sea_km', 'elevation_m'])
    
    X = df[feature_cols].fillna(0).values
    y = create_risk_labels(df['salinity_ppt'].values)
    
    return X, y


def train_risk_models(
    X: np.ndarray,
    y: np.ndarray,
    test_size: float = 0.2
) -> Dict:
    """Train risk scoring models."""
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=42)
    
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    models = {}
    
    lr = LogisticRegression(max_iter=1000, solver='lbfgs')
    lr.fit(X_train_scaled, y_train)
    models['logistic_regression'] = {
        'model': lr,
        'scaler': scaler,
        'train_score': lr.score(X_train_scaled, y_train),
        'test_score': lr.score(X_test_scaled, y_test)
    }
    
    rf = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
    rf.fit(X_train, y_train)
    models['random_forest'] = {
        'model': rf,
        'scaler': None,
        'train_score': rf.score(X_train, y_train),
        'test_score': rf.score(X_test, y_test)
    }
    
    gbm = GradientBoostingClassifier(n_estimators=100, max_depth=5, random_state=42)
    gbm.fit(X_train, y_train)
    models['gradient_boosting'] = {
        'model': gbm,
        'scaler': None,
        'train_score': gbm.score(X_train, y_train),
        'test_score': gbm.score(X_test, y_test)
    }
    
    return models


def calculate_risk_score(
    salinity: float,
    consecutive_days_above_1ppt: int = 0,
    consecutive_days_above_4ppt: int = 0
) -> float:
    """Calculate risk score (0-100) based on salinity and duration."""
    if salinity >= 4.0:
        intensity_risk = 75 + min((salinity - 4.0) * 5, 25)
    elif salinity >= 1.0:
        intensity_risk = 25 + (salinity - 1.0) * 16.67
    else:
        intensity_risk = salinity * 25
    
    duration_penalty = min(consecutive_days_above_1ppt * 2, 20)
    duration_penalty += min(consecutive_days_above_4ppt * 3, 15)
    
    risk_score = min(intensity_risk + duration_penalty, 100)
    return risk_score


def predict_risk_class(
    model: Dict,
    X: np.ndarray
) -> Tuple[np.ndarray, np.ndarray]:
    """Predict risk class using trained model."""
    if model['scaler'] is not None:
        X_scaled = model['scaler'].transform(X)
    else:
        X_scaled = X
    
    predictions = model['model'].predict(X_scaled)
    probabilities = model['model'].predict_proba(X_scaled)
    
    return predictions, probabilities

