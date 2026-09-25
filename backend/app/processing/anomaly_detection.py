from typing import Dict, List, Any
import numpy as np
import pandas as pd
from backend.app.core.config import AnomalyWeightsConfig


def detect_anomalies(
    df: pd.DataFrame,
    feature_cols: List[str],
    weights: AnomalyWeightsConfig = None,
    threshold: float = 0.50
) -> pd.DataFrame:
    """
    Sections 10 and 11: Multi-factor anomaly detection and classification.
    Calculates normalized scores (0.0 to 1.0) for:
    - temporal_score
    - spatial_score
    - statistical_score
    - final_anomaly_score
    And assigns an explainable anomaly_type.
    """
    if weights is None:
        weights = AnomalyWeightsConfig()

    result = df.copy()

    for feat in feature_cols:
        vals = result[feat].to_numpy()

        # 1. Statistical anomaly score using global Median Absolute Deviation (MAD)
        median_val = float(np.median(vals))
        mad = float(np.median(np.abs(vals - median_val)))
        mad = max(mad, 1e-4)
        stat_z = np.abs(vals - median_val) / (1.4826 * mad)
        # Sigmoid normalization to [0.0, 1.0]
        stat_score = 1.0 / (1.0 + np.exp(-1.2 * (stat_z - 3.0)))
        stat_score = np.clip(stat_score, 0.0, 1.0)
        result[f"{feat}_statistical_anomaly_score"] = stat_score

        # 2. Temporal anomaly score using rolling deviation and local gradient
        roll_std = result[f"{feat}_rolling_std"].to_numpy()
        safe_roll_std = np.maximum(roll_std, 0.2)
        local_grad = np.abs(result[f"{feat}_local_gradient"].to_numpy())
        temp_z = local_grad / safe_roll_std
        temp_score = 1.0 / (1.0 + np.exp(-1.5 * (temp_z - 2.5)))
        temp_score = np.clip(temp_score, 0.0, 1.0)
        result[f"{feat}_temporal_anomaly_score"] = temp_score

        # 3. Spatial anomaly score from pre-computed spatial deviation
        spatial_score = result[f"{feat}_spatial_anomaly_score"].to_numpy()

        # 4. Final weighted anomaly score
        w_temp = weights.temporal
        w_spat = weights.spatial
        w_stat = weights.statistical

        final_score = (w_temp * temp_score) + (w_spat * spatial_score) + (w_stat * stat_score)
        final_score = np.clip(final_score, 0.0, 1.0)
        result[f"{feat}_final_anomaly_score"] = final_score

        # 5. Classify anomaly type (Section 11)
        anomaly_types = []
        for i in range(len(result)):
            was_missing = result.at[i, f"was_missing_originally_{feat}"] if f"was_missing_originally_{feat}" in result.columns else False
            if was_missing:
                anomaly_types.append("MISSING")
                continue

            f_score = final_score[i]
            t_s = temp_score[i]
            s_s = spatial_score[i]
            st_s = stat_score[i]

            if f_score < threshold:
                # Check for subtle Gaussian noise
                if f_score > 0.25:
                    anomaly_types.append("GAUSSIAN_NOISE")
                else:
                    anomaly_types.append("NORMAL")
            else:
                # High score anomaly classification
                if st_s > 0.85 and t_s > 0.80 and s_s > 0.80:
                    anomaly_types.append("OUTLIER")
                elif t_s > 0.80 and s_s > 0.70:
                    anomaly_types.append("SPIKE")
                elif s_s > 0.75 and t_s < 0.40:
                    anomaly_types.append("SPATIAL_INCONSISTENCY")
                elif t_s > 0.75 and s_s < 0.40:
                    anomaly_types.append("TEMPORAL_INCONSISTENCY")
                elif s_s > 0.50 and st_s > 0.50 and t_s < 0.60:
                    anomaly_types.append("DRIFT")
                elif sum([t_s > 0.5, s_s > 0.5, st_s > 0.5]) >= 2:
                    anomaly_types.append("MIXED")
                else:
                    anomaly_types.append("UNKNOWN_ANOMALY")

        result[f"{feat}_anomaly_type"] = anomaly_types

    # For convenience and top-level provenance, if a primary target feature (like temperature) exists,
    # expose standard non-prefixed fields:
    primary = feature_cols[0]
    result["temporal_anomaly_score"] = result[f"{primary}_temporal_anomaly_score"]
    result["spatial_anomaly_score"] = result[f"{primary}_spatial_anomaly_score"]
    result["statistical_anomaly_score"] = result[f"{primary}_statistical_anomaly_score"]
    result["final_anomaly_score"] = result[f"{primary}_final_anomaly_score"]
    result["anomaly_type"] = result[f"{primary}_anomaly_type"]

    return result
