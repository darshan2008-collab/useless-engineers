from typing import Dict, List, Tuple, Any
import numpy as np
import pandas as pd


def handle_missing_values(
    df: pd.DataFrame,
    feature_cols: List[str]
) -> pd.DataFrame:
    """
    Section 6: Sophisticated missing value imputation preserving provenance.
    For each feature, adds:
    - was_missing_originally_<feature>
    - imputation_method_<feature>
    - imputed_value_<feature>
    - confidence_<feature>
    """
    processed = df.copy()

    for feat in feature_cols:
        was_missing = processed[feat].isna()
        processed[f"was_missing_originally_{feat}"] = was_missing
        processed[f"imputation_method_{feat}"] = "NONE"
        processed[f"imputed_value_{feat}"] = np.nan
        processed[f"confidence_{feat}"] = 1.0

        if not was_missing.any():
            continue

        # Group by sensor_id to handle each sensor's time series separately
        for sensor_id, group in processed.groupby("sensor_id"):
            sensor_indices = group.index
            series = group[feat].copy()

            if not series.isna().any():
                continue

            # Identify contiguous missing blocks
            is_na = series.isna()
            block_ids = (~is_na).cumsum()
            na_block_sizes = is_na.groupby(block_ids).transform("sum")

            # Strategy 1: Short gaps (<= 3 steps): linear time interpolation
            short_mask = is_na & (na_block_sizes <= 3)
            if short_mask.any():
                interpolated = series.interpolate(method="linear", limit_direction="both")
                short_indices = sensor_indices[short_mask]
                processed.loc[short_indices, f"imputation_method_{feat}"] = "SHORT_TIME_INTERPOLATION"
                processed.loc[short_indices, f"imputed_value_{feat}"] = interpolated.loc[short_indices]
                processed.loc[short_indices, f"confidence_{feat}"] = 0.95
                series.loc[short_indices] = interpolated.loc[short_indices]

            # Strategy 2: Medium gaps (4 to 8 steps): rolling window temporal average
            med_mask = is_na & (na_block_sizes > 3) & (na_block_sizes <= 8)
            if med_mask.any():
                rolling_avg = series.rolling(window=7, min_periods=1, center=True).mean()
                rolling_avg = rolling_avg.bfill().ffill()
                med_indices = sensor_indices[med_mask]
                processed.loc[med_indices, f"imputation_method_{feat}"] = "MEDIUM_ROLLING_TEMPORAL"
                processed.loc[med_indices, f"imputed_value_{feat}"] = rolling_avg.loc[med_indices]
                processed.loc[med_indices, f"confidence_{feat}"] = 0.75
                series.loc[med_indices] = rolling_avg.loc[med_indices]

            # Strategy 3: Long gaps (> 8 steps): fallback forward/back fill or global sensor median
            long_mask = is_na & (na_block_sizes > 8)
            if long_mask.any():
                sensor_median = series.median()
                if np.isnan(sensor_median):
                    sensor_median = processed[feat].median()
                fallback = series.bfill().ffill().fillna(sensor_median)
                long_indices = sensor_indices[long_mask]
                processed.loc[long_indices, f"imputation_method_{feat}"] = "LONG_GAP_FALLBACK_MEDIAN"
                processed.loc[long_indices, f"imputed_value_{feat}"] = fallback.loc[long_indices]
                processed.loc[long_indices, f"confidence_{feat}"] = 0.40
                series.loc[long_indices] = fallback.loc[long_indices]

            # Update the working values
            processed.loc[sensor_indices, feat] = series

    return processed


def compute_scalers(
    df: pd.DataFrame,
    feature_cols: List[str]
) -> Dict[str, Dict[str, float]]:
    """
    Section 7: Calculate robust scaler parameters (median and IQR/MAD) to prevent data leakage.
    Returns: dict of feature -> {"median": float, "scale": float}
    """
    scalers = {}
    for feat in feature_cols:
        valid_vals = df[feat].dropna().to_numpy()
        if len(valid_vals) == 0:
            scalers[feat] = {"median": 0.0, "scale": 1.0}
            continue
        med = float(np.median(valid_vals))
        q75, q25 = np.percentile(valid_vals, [75, 25])
        iqr = float(q75 - q25)
        # Use IQR or fallback to standard deviation if IQR is 0
        scale = iqr / 1.349 if iqr > 1e-6 else float(np.std(valid_vals))
        if scale < 1e-6:
            scale = 1.0

        scalers[feat] = {
            "median": med,
            "scale": scale
        }
    return scalers


def normalize_features(
    df: pd.DataFrame,
    feature_cols: List[str],
    scalers: Dict[str, Dict[str, float]]
) -> pd.DataFrame:
    """
    Normalize features for ML and Quantum encoding using provided scaler parameters.
    Adds normalized_<feature> columns without altering the physical sensor values.
    """
    out_df = df.copy()
    for feat in feature_cols:
        if feat in scalers:
            med = scalers[feat]["median"]
            scale = scalers[feat]["scale"]
            out_df[f"normalized_{feat}"] = (out_df[feat] - med) / scale
    return out_df
