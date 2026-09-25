from typing import List
import numpy as np
import pandas as pd


def generate_temporal_features(
    df: pd.DataFrame,
    feature_cols: List[str],
    window: int = 5
) -> pd.DataFrame:
    """
    Section 8: Strictly causal temporal feature engineering calculated independently per sensor.
    No future information is leaked.
    """
    result = df.copy()

    # Convert timestamps to datetime and sort
    result["_dt"] = pd.to_datetime(result["timestamp"])
    result.sort_values(by=["sensor_id", "_dt"], inplace=True)

    for feat in feature_cols:
        grouped = result.groupby("sensor_id")[feat]

        # 1. previous_value
        prev_col = f"{feat}_previous_value"
        result[prev_col] = grouped.shift(1)
        # For first observation, fill with current value
        result[prev_col] = result[prev_col].fillna(result[feat])

        # 2. temporal_difference (first order difference)
        diff_col = f"{feat}_temporal_difference"
        result[diff_col] = result[feat] - result[prev_col]

        # 3. rolling statistics (strictly backward-looking window)
        roll = grouped.rolling(window=window, min_periods=1)

        result[f"{feat}_rolling_mean"] = roll.mean().reset_index(level=0, drop=True)
        result[f"{feat}_rolling_std"] = roll.std().reset_index(level=0, drop=True).fillna(0.0)
        result[f"{feat}_rolling_median"] = roll.median().reset_index(level=0, drop=True)
        result[f"{feat}_rolling_min"] = roll.min().reset_index(level=0, drop=True)
        result[f"{feat}_rolling_max"] = roll.max().reset_index(level=0, drop=True)

        # 4. local_variance (square of rolling std)
        result[f"{feat}_local_variance"] = result[f"{feat}_rolling_std"] ** 2

        # 5. local_gradient (difference between current value and rolling mean)
        result[f"{feat}_local_gradient"] = result[feat] - result[f"{feat}_rolling_mean"]

    # 6. time_since_previous_observation (seconds)
    time_diff = result.groupby("sensor_id")["_dt"].diff().dt.total_seconds().fillna(300.0)
    result["time_since_previous_observation"] = time_diff

    # 7. rate_of_change per minute
    for feat in feature_cols:
        dt_mins = np.maximum(result["time_since_previous_observation"] / 60.0, 0.1)
        result[f"{feat}_rate_of_change"] = result[f"{feat}_temporal_difference"] / dt_mins

    result.drop(columns=["_dt"], inplace=True)
    return result
