import pytest
import pandas as pd
import numpy as np
from backend.app.processing.anomaly_detection import detect_anomalies
from backend.app.core.config import AnomalyWeightsConfig


def test_anomaly_detection_scoring():
    df = pd.DataFrame({
        "sensor_id": ["S001"] * 5,
        "timestamp": [f"2026-06-01 00:{i*5:02d}:00" for i in range(5)],
        "temperature": [20.0, 20.2, 55.0, 20.1, 20.3],  # Severe spike at index 2
        "temperature_rolling_std": [0.2, 0.2, 0.2, 0.2, 0.2],
        "temperature_local_gradient": [0.0, 0.1, 35.0, 0.1, 0.1],
        "temperature_spatial_anomaly_score": [0.05, 0.05, 0.95, 0.05, 0.05],
        "was_missing_originally_temperature": [False] * 5
    })

    weights = AnomalyWeightsConfig(temporal=0.35, spatial=0.40, statistical=0.25)
    anom_df = detect_anomalies(df, ["temperature"], weights=weights)

    # Spike at index 2 should have high score
    assert anom_df.at[2, "temperature_final_anomaly_score"] > 0.70
    assert anom_df.at[0, "temperature_final_anomaly_score"] < 0.30
    assert anom_df.at[2, "temperature_anomaly_type"] in ["OUTLIER", "SPIKE", "MIXED"]
