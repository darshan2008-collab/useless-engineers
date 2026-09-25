import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any


def inject_noise_to_dataset(
    clean_df: pd.DataFrame,
    noise_fractions: Dict[str, float] = None,
    seed: int = 42,
    target_features: List[str] = None
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Inject realistic noise into clean sensor readings.
    Returns:
    (noisy_df, noise_labels_df)

    Noise types:
    - GAUSSIAN_NOISE: Small perturbation (e.g. thermal / ADC noise)
    - SPIKE: Sudden high-amplitude impulse (e.g. power glitch, sudden disturbance)
    - OUTLIER: Extreme abnormal value (e.g. hardware bitflip)
    - DRIFT: Gradual linear or quadratic decalibration over hours
    - MISSING: Missing observation (NaN)
    - SPATIAL_ANOMALY: Sensor strongly deviates from its geographic cluster
    """
    if noise_fractions is None:
        noise_fractions = {
            "gaussian": 0.05,
            "spike": 0.015,
            "outlier": 0.01,
            "drift": 0.02,
            "missing": 0.015
        }

    if target_features is None:
        target_features = ["temperature", "humidity", "pressure", "air_quality", "noise_level"]

    rng = np.random.default_rng(seed)
    noisy_df = clean_df.copy()
    labels: List[Dict[str, Any]] = []

    sensors = clean_df["sensor_id"].unique()
    num_sensors = len(sensors)

    # Pick specific sensors for targeted multi-observation anomalies
    # Designate S005 as a spatial anomaly sensor (as specified in Section 26)
    spatial_anomaly_sensor = "S005" if "S005" in sensors else sensors[0]
    drift_sensors = [s for s in ["S012", "S024", "S038"] if s in sensors]
    if not drift_sensors and len(sensors) > 2:
        drift_sensors = [sensors[1], sensors[2]]

    # Process each feature
    for feature in target_features:
        values = clean_df[feature].to_numpy(dtype=float)
        std_val = float(np.std(values))
        mean_val = float(np.mean(values))

        # 1. Base subtle Gaussian noise on selected points (or all if configured)
        # Apply gentle realistic Gaussian noise across observations
        g_mask = rng.random(len(clean_df)) < noise_fractions.get("gaussian", 0.05)
        g_noise = rng.normal(0.0, 0.45 * std_val, size=len(clean_df))

        # 2. Spikes: Sudden sharp impulses (3x to 5x STD)
        spike_mask = (rng.random(len(clean_df)) < noise_fractions.get("spike", 0.015)) & (~g_mask)
        spike_sign = rng.choice([-1.0, 1.0], size=len(clean_df))
        spike_magnitudes = spike_sign * rng.uniform(3.5, 6.0, size=len(clean_df)) * std_val

        # 3. Extreme Outliers: Extreme sensor failures (6x to 10x STD)
        outlier_mask = (rng.random(len(clean_df)) < noise_fractions.get("outlier", 0.01)) & (~g_mask) & (~spike_mask)
        outlier_sign = rng.choice([-1.0, 1.0], size=len(clean_df))
        outlier_magnitudes = outlier_sign * rng.uniform(6.5, 12.0, size=len(clean_df)) * std_val

        # 4. Sensor Drift: Systematic ramp over time for designated sensors
        drift_mask = np.zeros(len(clean_df), dtype=bool)
        drift_magnitudes = np.zeros(len(clean_df), dtype=float)
        for d_sensor in drift_sensors:
            s_indices = clean_df.index[clean_df["sensor_id"] == d_sensor].to_numpy()
            n_pts = len(s_indices)
            if n_pts > 0:
                # Drift begins around 1/3 into the day and ramps up
                drift_start = n_pts // 3
                ramp = np.linspace(0.0, 3.5 * std_val, n_pts - drift_start)
                d_indices = s_indices[drift_start:]
                drift_mask[d_indices] = True
                drift_magnitudes[d_indices] = ramp

        # 5. Spatial Anomaly: Specific sensor (e.g. S005) deviates strongly during the afternoon (Section 26)
        spatial_mask = np.zeros(len(clean_df), dtype=bool)
        spatial_magnitudes = np.zeros(len(clean_df), dtype=float)
        s005_indices = clean_df.index[clean_df["sensor_id"] == spatial_anomaly_sensor].to_numpy()
        if len(s005_indices) > 50:
            # Inject spatial anomaly in the afternoon hours (readings 120 to 180)
            target_span = s005_indices[120:min(180, len(s005_indices))]
            spatial_mask[target_span] = True
            # Shift by +4.5 std deviations (e.g. 48.9°C when neighbors are 31.2°C)
            spatial_magnitudes[target_span] = 4.5 * std_val

        # 6. Missing values: Sensor communication dropouts (represented by NaN)
        missing_mask = (rng.random(len(clean_df)) < noise_fractions.get("missing", 0.015)) & (~spatial_mask)

        # Apply noise to values array
        noisy_vals = values.copy()

        # Apply Gaussian
        noisy_vals[g_mask] += g_noise[g_mask]

        # Apply Spikes
        noisy_vals[spike_mask] += spike_magnitudes[spike_mask]

        # Apply Outliers
        noisy_vals[outlier_mask] += outlier_magnitudes[outlier_mask]

        # Apply Drift
        noisy_vals[drift_mask] += drift_magnitudes[drift_mask]

        # Apply Spatial
        noisy_vals[spatial_mask] += spatial_magnitudes[spatial_mask]

        # Apply Missing
        noisy_vals[missing_mask] = np.nan

        noisy_df[feature] = np.round(noisy_vals, 3)

        # Record noise labels for auditing & benchmark validation
        for i in range(len(clean_df)):
            orig_val = float(values[i])
            curr_noisy_val = float(noisy_vals[i]) if not np.isnan(noisy_vals[i]) else np.nan

            noise_type = "NORMAL"
            is_corrupted = False
            mag = 0.0

            if missing_mask[i]:
                noise_type = "MISSING"
                is_corrupted = True
                mag = np.nan
            elif spatial_mask[i]:
                noise_type = "SPATIAL_ANOMALY"
                is_corrupted = True
                mag = float(curr_noisy_val - orig_val)
            elif outlier_mask[i]:
                noise_type = "OUTLIER"
                is_corrupted = True
                mag = float(curr_noisy_val - orig_val)
            elif spike_mask[i]:
                noise_type = "SPIKE"
                is_corrupted = True
                mag = float(curr_noisy_val - orig_val)
            elif drift_mask[i]:
                noise_type = "DRIFT"
                is_corrupted = True
                mag = float(curr_noisy_val - orig_val)
            elif g_mask[i]:
                noise_type = "GAUSSIAN_NOISE"
                is_corrupted = True
                mag = float(curr_noisy_val - orig_val)

            labels.append({
                "sensor_id": clean_df.at[i, "sensor_id"],
                "timestamp": clean_df.at[i, "timestamp"],
                "feature": feature,
                "noise_type": noise_type,
                "ground_truth_value": round(orig_val, 3),
                "noisy_value": round(curr_noisy_val, 3) if not np.isnan(curr_noisy_val) else np.nan,
                "noise_magnitude": round(mag, 3) if not np.isnan(mag) else np.nan,
                "is_corrupted": is_corrupted
            })

    noise_labels_df = pd.DataFrame(labels)
    return noisy_df, noise_labels_df
