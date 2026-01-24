"""Geographic utilities for calculating distances and finding nearest stations."""

import math
from typing import List, Dict, Tuple, Optional
import pandas as pd


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points on Earth.
    
    Args:
        lat1, lon1: Latitude and longitude of first point in decimal degrees
        lat2, lon2: Latitude and longitude of second point in decimal degrees
    
    Returns:
        Distance in kilometers
    """
    # Convert to radians
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    
    # Haversine formula
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    # Earth radius in kilometers
    radius = 6371.0
    
    return radius * c


def find_nearest_stations(
    target_lat: float,
    target_lon: float,
    stations_data: pd.DataFrame,
    top_n: int = 3
) -> List[Dict[str, any]]:
    """
    Find the nearest N stations to a target location.
    
    Args:
        target_lat: Target latitude
        target_lon: Target longitude
        stations_data: DataFrame with columns: station_id, station_name, lat, lon (if available)
        top_n: Number of nearest stations to return
    
    Returns:
        List of dicts with station_id, station_name, distance_km
    """
    # Get unique stations with their metadata
    station_groups = stations_data.groupby('station_id').first().reset_index()
    
    # Calculate distances
    distances = []
    for _, row in station_groups.iterrows():
        # Try to get lat/lon from station data
        # Note: current CSV doesn't have lat/lon, so we'll need to add them or use approximate locations
        station_id = row['station_id']
        station_name = row.get('station_name', station_id)
        
        # Approximate locations for HCM stations (you should replace with real data)
        station_locations = {
            'HCM01': (10.6667, 106.6333),  # Nhà Bè
            'HCM02': (10.7667, 106.7833),  # Cát Lái
            'HCM03': (10.5167, 106.8333),  # Lý Nhơn
            'HCM04': (10.6000, 106.9000),  # Long Đại
        }
        
        if station_id in station_locations:
            station_lat, station_lon = station_locations[station_id]
        else:
            # Skip stations without location data
            continue
        
        distance = haversine_distance(target_lat, target_lon, station_lat, station_lon)
        
        distances.append({
            'station_id': station_id,
            'station_name': station_name,
            'distance_km': round(distance, 2),
            'lat': station_lat,
            'lon': station_lon
        })
    
    # Sort by distance and return top N
    distances.sort(key=lambda x: x['distance_km'])
    return distances[:top_n]


def get_station_location(station_id: str) -> Optional[Tuple[float, float]]:
    """
    Get the location (lat, lon) for a given station ID.
    
    Args:
        station_id: Station identifier
    
    Returns:
        Tuple of (lat, lon) or None if not found
    """
    # Approximate locations for HCM stations
    # TODO: Load from database or configuration file
    station_locations = {
        'HCM01': (10.6667, 106.6333),  # Nhà Bè - Đồng Điền River
        'HCM02': (10.7667, 106.7833),  # Cát Lái - Sài Gòn River
        'HCM03': (10.5167, 106.8333),  # Lý Nhơn - Soài Rạp River
        'HCM04': (10.6000, 106.9000),  # Long Đại - Đồng Nai River
    }
    
    return station_locations.get(station_id)


def calculate_distance_matrix(locations: List[Tuple[float, float]]) -> List[List[float]]:
    """
    Calculate distance matrix for a list of locations.
    
    Args:
        locations: List of (lat, lon) tuples
    
    Returns:
        2D list where matrix[i][j] is distance from location i to j in km
    """
    n = len(locations)
    matrix = [[0.0] * n for _ in range(n)]
    
    for i in range(n):
        for j in range(i + 1, n):
            dist = haversine_distance(
                locations[i][0], locations[i][1],
                locations[j][0], locations[j][1]
            )
            matrix[i][j] = dist
            matrix[j][i] = dist
    
    return matrix


def is_location_in_polygon(lat: float, lon: float, polygon_coords: List[List[float]]) -> bool:
    """
    Check if a point is inside a polygon using ray casting algorithm.
    
    Args:
        lat, lon: Point coordinates
        polygon_coords: List of [lon, lat] pairs forming the polygon
    
    Returns:
        True if point is inside polygon, False otherwise
    """
    x, y = lon, lat
    n = len(polygon_coords)
    inside = False
    
    p1x, p1y = polygon_coords[0]
    for i in range(1, n + 1):
        p2x, p2y = polygon_coords[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    
    return inside
