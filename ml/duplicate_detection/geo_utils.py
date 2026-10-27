"""Geographic utilities for location-based duplicate detection."""

import math
from typing import Optional


def haversine_distance(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float
) -> float:
    """
    Calculate the great circle distance between two points on Earth.
    
    Uses the Haversine formula to calculate the distance in meters between
    two geographic coordinates.
    
    Args:
        lat1: Latitude of first point in decimal degrees
        lon1: Longitude of first point in decimal degrees
        lat2: Latitude of second point in decimal degrees
        lon2: Longitude of second point in decimal degrees
        
    Returns:
        Distance in meters
        
    Raises:
        ValueError: If coordinates are invalid
    """
    # Validate coordinates
    if not (-90 <= lat1 <= 90) or not (-90 <= lat2 <= 90):
        raise ValueError(f"Latitude must be between -90 and 90 degrees")
    
    if not (-180 <= lon1 <= 180) or not (-180 <= lon2 <= 180):
        raise ValueError(f"Longitude must be between -180 and 180 degrees")
    
    # Earth's radius in meters
    R = 6371000
    
    # Convert decimal degrees to radians
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    # Haversine formula
    a = (math.sin(delta_lat / 2) ** 2 +
         math.cos(lat1_rad) * math.cos(lat2_rad) *
         math.sin(delta_lon / 2) ** 2)
    
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    distance = R * c
    
    return distance


def validate_coordinates(
    latitude: Optional[float],
    longitude: Optional[float]
) -> bool:
    """
    Check if coordinates are valid.
    
    Args:
        latitude: Latitude in decimal degrees (or None)
        longitude: Longitude in decimal degrees (or None)
        
    Returns:
        True if coordinates are valid, False if missing or invalid
    """
    if latitude is None or longitude is None:
        return False
    
    if not (-90 <= latitude <= 90):
        return False
    
    if not (-180 <= longitude <= 180):
        return False
    
    return True
