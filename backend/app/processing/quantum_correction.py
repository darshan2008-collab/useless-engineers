from typing import List
import numpy as np
import pandas as pd


def compute_bounded_quantum_corrections(
    df: pd.DataFrame,
    quantum_expectations: np.ndarray,
    residual_scale: float,
    target_feature: str = "temperature",
    max_std_multiplier: float = 3.0
) -> pd.DataFrame:
    """
    Section 17: Transform quantum expectation values to physical residuals with robust local constraints.
    quantum_corrected = noisy_value + predicted_residual
    maximum correction = 3 * robust local standard deviation
    """
    result = df.copy()

    # Scale expectation values back to physical units
    raw_residual_predictions = quantum_expectations * residual_scale

    # Local uncertainty bounds
    local_stds = result.get(f"{target_feature}_rolling_std", pd.Series(1.5, index=result.index)).to_numpy(dtype=float)
    # Ensure minimum safe local threshold
    safe_local_std = np.maximum(local_stds, 0.5)
    max_allowed_magnitude = max_std_multiplier * safe_local_std

    # Clip quantum correction to prevent unphysical extremes
    bounded_residuals = np.clip(
        raw_residual_predictions,
        -max_allowed_magnitude,
        max_allowed_magnitude
    )

    noisy_vals = result[target_feature].to_numpy(dtype=float)
    quantum_corrected = noisy_vals + bounded_residuals

    # Record provenance fields
    result[f"quantum_output_{target_feature}"] = np.round(quantum_expectations, 4)
    result[f"quantum_correction_{target_feature}"] = np.round(bounded_residuals, 3)
    result[f"quantum_corrected_{target_feature}"] = np.round(quantum_corrected, 3)

    # Standard columns
    result["quantum_output"] = result[f"quantum_output_{target_feature}"]
    result["quantum_correction"] = result[f"quantum_correction_{target_feature}"]
    result["quantum_corrected_value"] = result[f"quantum_corrected_{target_feature}"]

    return result
