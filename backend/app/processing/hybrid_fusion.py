import numpy as np
import pandas as pd
from backend.app.core.config import FusionConfig


def adaptive_hybrid_fusion(
    df: pd.DataFrame,
    target_feature: str = "temperature",
    fusion_cfg: FusionConfig = None
) -> pd.DataFrame:
    """
    Section 19: Dynamic, anomaly-aware fusion weighting alpha in [0.0, max_alpha].
    Low anomaly -> relies mostly on smooth classical Kalman filter.
    High anomaly / complex spatial deviation -> quantum model contributes heavily to correct the residual.
    """
    if fusion_cfg is None:
        fusion_cfg = FusionConfig()

    result = df.copy()

    # Classical filter result (defaulting to Kalman filter)
    classical_col = f"classical_{target_feature}"
    if classical_col not in result.columns:
        classical_col = f"kalman_{target_feature}" if f"kalman_{target_feature}" in result.columns else f"ma_{target_feature}"

    classical_vals = result[classical_col].to_numpy(dtype=float)
    quantum_vals = result[f"quantum_corrected_{target_feature}"].to_numpy(dtype=float)

    # Component scores
    anom_score = result.get(f"{target_feature}_final_anomaly_score", result.get("final_anomaly_score", pd.Series(0.0, index=result.index))).to_numpy(dtype=float)
    spat_score = result.get(f"{target_feature}_spatial_anomaly_score", result.get("spatial_anomaly_score", pd.Series(0.0, index=result.index))).to_numpy(dtype=float)
    temp_score = result.get(f"{target_feature}_temporal_anomaly_score", result.get("temporal_anomaly_score", pd.Series(0.0, index=result.index))).to_numpy(dtype=float)

    # Calculate adaptive alpha
    alpha = (
        fusion_cfg.base_alpha
        + fusion_cfg.anomaly_gain * anom_score
        + fusion_cfg.spatial_gain * spat_score
        + fusion_cfg.temporal_gain * temp_score
    )
    alpha = np.clip(alpha, 0.0, fusion_cfg.max_alpha)

    # Weighted combination: (1 - alpha) * classical + alpha * quantum
    fused_vals = (1.0 - alpha) * classical_vals + alpha * quantum_vals

    result[f"fusion_weight_{target_feature}"] = np.round(alpha, 4)
    result[f"fused_{target_feature}"] = np.round(fused_vals, 3)

    # Expose root columns for provenance
    result["fusion_weight"] = result[f"fusion_weight_{target_feature}"]
    result["classical_value"] = classical_vals
    result["fused_value"] = result[f"fused_{target_feature}"]

    return result
