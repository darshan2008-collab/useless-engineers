from typing import Tuple, List
import numpy as np
import pandas as pd
from backend.app.quantum.encoder import extract_quantum_feature_vector, encode_features_to_angles


def prepare_quantum_feature_matrix(
    df: pd.DataFrame,
    target_feature: str = "temperature",
    num_qubits: int = 4
) -> np.ndarray:
    """
    Extract and angle-encode the feature matrix for all observations.
    Returns: np.ndarray of shape (N, num_qubits) with angles in [-pi, pi].
    """
    n = len(df)
    angle_matrix = np.zeros((n, num_qubits), dtype=float)

    for i in range(n):
        row = df.iloc[i]
        feat_vec = extract_quantum_feature_vector(row, feature_name=target_feature, num_qubits=num_qubits)
        angles = encode_features_to_angles(feat_vec)
        angle_matrix[i] = angles

    return angle_matrix
