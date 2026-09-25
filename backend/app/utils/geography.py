import numpy as np
from typing import List, Tuple, Dict


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points on the earth in meters.
    Vector-compatible or scalar-compatible.
    """
    # Earth radius in meters
    R = 6371000.0

    phi1 = np.radians(lat1)
    phi2 = np.radians(lat2)
    delta_phi = np.radians(lat2 - lat1)
    delta_lambda = np.radians(lon2 - lon1)

    a = (
        np.sin(delta_phi / 2.0) ** 2
        + np.cos(phi1) * np.cos(phi2) * np.sin(delta_lambda / 2.0) ** 2
    )
    # Clip to avoid numerical domain error with arcsin/arctan2
    a = np.clip(a, 0.0, 1.0)
    c = 2.0 * np.arctan2(np.sqrt(a), np.sqrt(1.0 - a))

    return float(R * c)


def compute_sensor_distance_matrix(sensor_coords: Dict[str, Tuple[float, float]]) -> Dict[str, Dict[str, float]]:
    """
    Precompute pairwise distances between sensors to avoid recalculating every row.
    sensor_coords: dict mapping sensor_id -> (lat, lon)
    Returns: dict[sensor_a][sensor_b] = distance_meters
    """
    sensor_ids = list(sensor_coords.keys())
    dist_matrix: Dict[str, Dict[str, float]] = {s_id: {} for s_id in sensor_ids}

    for i, s1 in enumerate(sensor_ids):
        lat1, lon1 = sensor_coords[s1]
        dist_matrix[s1][s1] = 0.0
        for j in range(i + 1, len(sensor_ids)):
            s2 = sensor_ids[j]
            lat2, lon2 = sensor_coords[s2]
            d = haversine_distance(lat1, lon1, lat2, lon2)
            dist_matrix[s1][s2] = d
            dist_matrix[s2][s1] = d

    return dist_matrix


def get_neighbors_within_radius(
    sensor_id: str,
    distance_matrix: Dict[str, Dict[str, float]],
    radius_meters: float
) -> List[Tuple[str, float]]:
    """
    Return sorted list of (neighbor_id, distance_meters) within radius_meters excluding the sensor itself.
    """
    if sensor_id not in distance_matrix:
        return []

    neighbors = [
        (other_id, dist)
        for other_id, dist in distance_matrix[sensor_id].items()
        if other_id != sensor_id and dist <= radius_meters
    ]
    neighbors.sort(key=lambda x: x[1])
    return neighbors
