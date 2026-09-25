import pytest
import pandas as pd
import numpy as np
from backend.app.processing.classical_filters import apply_moving_average, apply_gaussian_filter, apply_kalman_filter


def test_classical_filters():
    df = pd.DataFrame({
        "sensor_id": ["S001"] * 6,
        "timestamp": [f"2026-06-01 00:{i*5:02d}:00" for i in range(6)],
        "temperature": [20.0, 20.0, 30.0, 20.0, 20.0, 20.0]
    })

    ma_df = apply_moving_average(df, ["temperature"], window=3)
    assert "ma_temperature" in ma_df.columns
    # Moving average should dampen the spike of 30.0
    assert ma_df.at[2, "ma_temperature"] < 30.0

    gauss_df = apply_gaussian_filter(df, ["temperature"], sigma=1.0)
    assert "gaussian_temperature" in gauss_df.columns
    assert gauss_df.at[2, "gaussian_temperature"] < 30.0

    kalman_df = apply_kalman_filter(df, ["temperature"], process_noise=0.05, measurement_noise=1.0)
    assert "kalman_temperature" in kalman_df.columns
    assert kalman_df.at[2, "kalman_temperature"] < 30.0
