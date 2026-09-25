from typing import List, Dict, Any
import numpy as np
import pandas as pd


def extract_quantum_feature_vector(
    row: pd.Series,
    feature_name: str = "temperature",
    num_qubits: int = 4
) -> np.ndarray:
    """
    Section 14: Extract normalized quantum feature vector from processed telemetry row.
    Features:
    1. normalized current sensor value
    2. normalized temporal difference
    3. normalized rolling variance
    4. normalized spatial deviation
    5. anomaly score
    """
    # 1. Normalized current sensor value
    norm_val = float(row.get(f"normalized_{feature_name}", 0.0))
    if np.isnan(norm_val):
        norm_val = 0.0

    # 2. Normalized temporal difference
    t_diff = float(row.get(f"{feature_name}_temporal_difference", 0.0))
    # Bound to [-3.0, 3.0] then scale
    norm_tdiff = float(np.clip(t_diff / 3.0, -3.0, 3.0))

    # 3. Normalized rolling variance
    r_var = float(row.get(f"{feature_name}_local_variance", 0.0))
    norm_var = float(np.clip(np.log1p(max(0.0, r_var)), 0.0, 3.0))

    # 4. Normalized spatial deviation
    s_dev = float(row.get(f"{feature_name}_spatial_deviation", 0.0))
    norm_sdev = float(np.clip(s_dev / 3.0, -3.0, 3.0))

    # 5. Final anomaly score [0.0, 1.0]
    anom_score = float(row.get(f"{feature_name}_final_anomaly_score", row.get("final_anomaly_score", 0.0)))
    if np.isnan(anom_score):
        anom_score = 0.0

    all_features = [norm_val, norm_tdiff, norm_var, norm_sdev, anom_score]

    # If 4 qubits, select the first 4 (as specified in Section 14)
    selected = all_features[:num_qubits]
    return np.array(selected, dtype=float)


def encode_features_to_angles(feature_vector: np.ndarray) -> np.ndarray:
    """
    Map normalized real values into rotation angles in the range [-pi, pi] using arctan.
    Deterministic and bounded.
    """
    return np.arctan(feature_vector) * (np.pi / 2.0)
