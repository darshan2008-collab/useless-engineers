import pytest
import pandas as pd
import numpy as np
from backend.app.processing.temporal_features import generate_temporal_features


def test_temporal_features_causality():
    df = pd.DataFrame({
        "sensor_id": ["S001"] * 5,
        "timestamp": [
            "2026-06-01 00:00:00",
            "2026-06-01 00:05:00",
            "2026-06-01 00:10:00",
            "2026-06-01 00:15:00",
            "2026-06-01 00:20:00",
        ],
        "temperature": [20.0, 22.0, 24.0, 26.0, 28.0]
    })
    tf = generate_temporal_features(df, ["temperature"], window=3)

    # First difference: 22 - 20 = 2.0
    assert tf.at[1, "temperature_temporal_difference"] == 2.0
    # Backward rolling mean of [20, 22, 24] = 22.0
    assert abs(tf.at[2, "temperature_rolling_mean"] - 22.0) < 1e-4
    assert tf.at[2, "temperature_previous_value"] == 22.0
