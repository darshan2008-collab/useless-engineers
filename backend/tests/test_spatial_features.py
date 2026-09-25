import pytest
import pandas as pd
import numpy as np
from backend.app.utils.geography import haversine_distance
from backend.app.processing.spatial_features import generate_spatial_features


def test_haversine_distance():
    # San Francisco to Oakland ~13-15km
    sf_lat, sf_lon = 37.7749, -122.4194
    oak_lat, oak_lon = 37.8044, -122.2711
    dist = haversine_distance(sf_lat, sf_lon, oak_lat, oak_lon)
    assert 12000 < dist < 16000

    # Same point distance should be 0
    assert haversine_distance(sf_lat, sf_lon, sf_lat, sf_lon) == 0.0


def test_spatial_features_synchronicity():
    # Two sensors ~200 meters apart at identical timestamp
    df = pd.DataFrame({
        "sensor_id": ["S001", "S002"],
        "timestamp": ["2026-06-01 00:00:00", "2026-06-01 00:00:00"],
        "latitude": [37.7749, 37.7755],
        "longitude": [-122.4194, -122.4190],
        "temperature": [21.0, 23.0]
    })
    sf = generate_spatial_features(df, ["temperature"], radius_meters=500.0)
    assert sf.at[0, "neighbor_count"] == 1
    # S001's neighbor mean is S002's temperature (23.0)
    assert abs(sf.at[0, "temperature_neighbor_mean"] - 23.0) < 1e-4
