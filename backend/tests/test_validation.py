import pytest
import pandas as pd
import numpy as np
from backend.app.processing.validation import validate_csv_data


def test_validation_clean_data():
    df = pd.DataFrame({
        "sensor_id": ["S001", "S001", "S002"],
        "timestamp": ["2026-06-01 00:00:00", "2026-06-01 00:05:00", "2026-06-01 00:00:00"],
        "latitude": [37.77, 37.77, 37.78],
        "longitude": [-122.41, -122.41, -122.42],
        "temperature": [22.5, 22.8, 23.1]
    })
    res = validate_csv_data(df)
    assert res.is_valid
    assert res.report["valid_rows"] == 3
    assert res.feature_columns == ["temperature"]


def test_validation_corrupted_rows():
    df = pd.DataFrame({
        "sensor_id": ["S001", None, "S002", "S002"],
        "timestamp": ["2026-06-01 00:00:00", "2026-06-01 00:05:00", "not_a_time", "2026-06-01 00:00:00"],
        "latitude": [37.77, 37.77, 200.0, 37.78],
        "longitude": [-122.41, -122.41, -122.42, -122.42],
        "temperature": [22.5, 22.8, 23.1, 23.1]
    })
    res = validate_csv_data(df)
    assert res.report["missing_sensor_ids"] == 1
    assert res.report["invalid_coordinates"] == 1
    assert res.report["invalid_timestamps"] == 1
    assert res.report["valid_rows"] == 2
