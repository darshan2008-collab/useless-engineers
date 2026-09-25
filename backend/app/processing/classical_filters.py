from typing import List
import numpy as np
import pandas as pd
from scipy.ndimage import gaussian_filter1d


def apply_moving_average(
    df: pd.DataFrame,
    feature_cols: List[str],
    window: int = 5
) -> pd.DataFrame:
    """
    Section 12: Moving average filter applied per sensor and per feature.
    Adds `ma_<feature>` to the DataFrame.
    """
    result = df.copy()
    for feat in feature_cols:
        ma_series = (
            result.groupby("sensor_id")[feat]
            .rolling(window=window, min_periods=1, center=False)
            .mean()
            .reset_index(level=0, drop=True)
        )
        result[f"ma_{feat}"] = np.round(ma_series, 3)
    return result


def apply_gaussian_filter(
    df: pd.DataFrame,
    feature_cols: List[str],
    sigma: float = 1.5
) -> pd.DataFrame:
    """
    Section 12: 1D Gaussian smoothing filter applied per sensor and per feature.
    Adds `gaussian_<feature>` to the DataFrame.
    """
    result = df.copy()
    for feat in feature_cols:
        smoothed_vals = np.zeros(len(result), dtype=float)
        for _, group in result.groupby("sensor_id"):
            series = group[feat].to_numpy(dtype=float)
            # Apply 1D Gaussian kernel
            smoothed = gaussian_filter1d(series, sigma=sigma, mode="nearest")
            smoothed_vals[group.index] = smoothed
        result[f"gaussian_{feat}"] = np.round(smoothed_vals, 3)
    return result


class Discrete1DKalmanFilter:
    """
    State-space Kalman Filter for a 1D kinematic sensor signal:
    State: x = [position, velocity]^T
    Transition: F = [[1, dt], [0, 1]]
    Measurement: H = [1, 0]
    Covariance: P = [[1, 0], [0, 1]]
    """
    def __init__(self, dt: float = 1.0, process_noise: float = 0.05, measurement_noise: float = 1.0):
        self.dt = dt
        self.F = np.array([[1.0, dt], [0.0, 1.0]])
        self.H = np.array([[1.0, 0.0]])
        self.Q = np.array([
            [(dt**4) / 4.0, (dt**3) / 2.0],
            [(dt**3) / 2.0, dt**2]
        ]) * process_noise
        self.R = np.array([[measurement_noise]])

    def filter_series(self, observations: np.ndarray) -> np.ndarray:
        n = len(observations)
        filtered = np.zeros(n)

        # Initial state estimate
        x = np.array([[observations[0]], [0.0]])
        P = np.eye(2) * 5.0

        for t in range(n):
            z = observations[t]

            # 1. Predict step
            x_pred = self.F @ x
            P_pred = self.F @ P @ self.F.T + self.Q

            # 2. Update step
            y = z - (self.H @ x_pred)[0, 0]  # Innovation residual
            S = (self.H @ P_pred @ self.H.T) + self.R  # Innovation covariance
            K = (P_pred @ self.H.T) / S[0, 0]  # Kalman gain

            x = x_pred + K * y
            P = (np.eye(2) - K @ self.H) @ P_pred

            filtered[t] = x[0, 0]

        return filtered


def apply_kalman_filter(
    df: pd.DataFrame,
    feature_cols: List[str],
    process_noise: float = 0.05,
    measurement_noise: float = 1.0
) -> pd.DataFrame:
    """
    Section 12: Discrete state-space Kalman Filter applied per sensor and per feature.
    Adds `kalman_<feature>` and `classical_<feature>` to the DataFrame.
    """
    result = df.copy()
    kf = Discrete1DKalmanFilter(process_noise=process_noise, measurement_noise=measurement_noise)

    for feat in feature_cols:
        filtered_vals = np.zeros(len(result), dtype=float)
        for _, group in result.groupby("sensor_id"):
            series = group[feat].to_numpy(dtype=float)
            filtered = kf.filter_series(series)
            filtered_vals[group.index] = filtered

        rounded = np.round(filtered_vals, 3)
        result[f"kalman_{feat}"] = rounded
        # Standardize classical baseline label
        result[f"classical_{feat}"] = rounded

    return result
