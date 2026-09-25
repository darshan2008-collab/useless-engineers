import pytest
import pandas as pd
import numpy as np
from backend.app.processing.preprocessing import handle_missing_values, compute_scalers, normalize_features


def test_missing_value_imputation():
    df = pd.DataFrame({
        "sensor_id": ["S001"] * 6,
        "timestamp": [f"2026-06-01 00:{i*5:02d}:00" for i in range(6)],
        "temperature": [20.0, 21.0, np.nan, 23.0, 24.0, 25.0]
    })
    imputed = handle_missing_values(df, ["temperature"])
    assert not imputed["temperature"].isna().any()
    # Interpolated value between 21.0 and 23.0 should be 22.0
    assert abs(imputed.at[2, "temperature"] - 22.0) < 1e-4
    assert imputed.at[2, "was_missing_originally_temperature"] == True
    assert imputed.at[2, "imputation_method_temperature"] == "SHORT_TIME_INTERPOLATION"


def test_robust_scalers_and_normalization():
    df = pd.DataFrame({
        "sensor_id": ["S001"] * 5,
        "timestamp": [f"2026-06-01 00:{i*5:02d}:00" for i in range(5)],
        "temperature": [10.0, 20.0, 30.0, 40.0, 50.0]
    })
    scalers = compute_scalers(df, ["temperature"])
    assert scalers["temperature"]["median"] == 30.0
    norm_df = normalize_features(df, ["temperature"], scalers)
    assert "normalized_temperature" in norm_df.columns
    # Median should normalize to 0.0
    assert abs(norm_df.at[2, "normalized_temperature"]) < 1e-4
