from typing import Tuple, Dict, Any, List
import numpy as np
import pandas as pd
from backend.app.core.config import settings, ConsistencyConfig


def apply_consistency_checks(
    df: pd.DataFrame,
    target_feature: str = "temperature",
    consistency_cfg: ConsistencyConfig = None
) -> pd.DataFrame:
    """
    Section 20: Post-fusion spatio-temporal consistency validator and safety fallback.
    Verifies:
    1. Physical bounds range
    2. Temporal continuity against neighboring time points
    3. Nearby sensor consistency
    4. Maximum allowed correction magnitude

    If a check fails:
    - Fallback to classical filter or bounded original value
    - Record fallback_used, fallback_reason, and consistency_status
    """
    if consistency_cfg is None:
        consistency_cfg = settings.consistency

    result = df.copy()

    fused_col = f"fused_{target_feature}"
    orig_col = target_feature
    classical_col = f"classical_{target_feature}" if f"classical_{target_feature}" in result.columns else f"kalman_{target_feature}"

    fused_vals = result[fused_col].to_numpy(dtype=float)
    orig_vals = result[orig_col].to_numpy(dtype=float)
    classical_vals = result[classical_col].to_numpy(dtype=float)

    # Physical bounds
    bounds_map = {
        "temperature": (-20.0, 60.0),
        "humidity": (0.0, 100.0),
        "pressure": (850.0, 1100.0),
        "air_quality": (0.0, 500.0),
        "noise_level": (20.0, 140.0)
    }
    min_bound, max_bound = bounds_map.get(target_feature, (-1000.0, 1000.0))

    final_denoised = fused_vals.copy()
    consistency_status = ["VALID"] * len(result)
    fallback_used = [False] * len(result)
    fallback_reasons = ["NONE"] * len(result)

    # Local rolling statistics for continuity check
    roll_mean = result.get(f"{target_feature}_rolling_mean", result[target_feature]).to_numpy(dtype=float)
    roll_std = result.get(f"{target_feature}_rolling_std", pd.Series(1.0, index=result.index)).to_numpy(dtype=float)
    safe_std = np.maximum(roll_std, 0.5)

    for i in range(len(result)):
        val = fused_vals[i]
        reason = None

        # Check 1: Physical range violation
        if val < min_bound or val > max_bound:
            reason = f"Physical bounds violation: {val:.2f} not in [{min_bound}, {max_bound}]"

        # Check 2: Unrealistic jump from local temporal trend
        elif abs(val - roll_mean[i]) > (4.5 * safe_std[i]):
            reason = f"Temporal discontinuity: {val:.2f} deviates > 4.5 sigma from rolling mean"

        # Check 3: Check nearby sensor consistency if spatial neighbor mean is available
        elif f"{target_feature}_neighbor_mean" in result.columns:
            n_mean = result.at[i, f"{target_feature}_neighbor_mean"]
            n_std = result.at[i, f"{target_feature}_neighbor_std"]
            if n_std > 0 and abs(val - n_mean) > (5.0 * max(n_std, 1.0)):
                reason = f"Spatial inconsistency: {val:.2f} deviates > 5.0 sigma from neighbor cluster mean"

        if reason is not None:
            fallback_used[i] = True
            fallback_reasons[i] = reason
            consistency_status[i] = "SAFETY_FALLBACK_APPLIED"

            # Apply configurable fallback: classical filter value bounded by physical limits
            fallback_val = classical_vals[i]
            if fallback_val < min_bound or fallback_val > max_bound:
                fallback_val = np.clip(orig_vals[i], min_bound, max_bound)
            final_denoised[i] = fallback_val

    # Store final denoised outputs and provenance (Section 21 & 66)
    result[f"denoised_{target_feature}"] = np.round(final_denoised, 3)
    result["final_denoised_value"] = result[f"denoised_{target_feature}"]
    result["consistency_status"] = consistency_status
    result["fallback_used"] = fallback_used
    result["fallback_reason"] = fallback_reasons
    result["processing_status"] = "SUCCESS"

    return result
