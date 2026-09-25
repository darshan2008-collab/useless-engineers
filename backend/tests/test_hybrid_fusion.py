import pytest
import numpy as np
import pandas as pd
from backend.app.core.config import FusionConfig
from backend.app.processing.hybrid_fusion import adaptive_hybrid_fusion
from backend.app.processing.consistency import apply_consistency_checks


def test_adaptive_hybrid_fusion():
    df = pd.DataFrame({
        "classical_temperature": [20.0, 20.0],
        "quantum_corrected_temperature": [25.0, 25.0],
        "final_anomaly_score": [0.0, 1.0],      # Row 0 low anomaly, Row 1 high anomaly
        "spatial_anomaly_score": [0.0, 0.5],
        "temporal_anomaly_score": [0.0, 0.5]
    })
    cfg = FusionConfig(base_alpha=0.10, anomaly_gain=0.60, spatial_gain=0.10, temporal_gain=0.10, max_alpha=0.90)
    fused_df = adaptive_hybrid_fusion(df, target_feature="temperature", fusion_cfg=cfg)

    # Row 0 alpha should be base_alpha (0.10)
    assert abs(fused_df.at[0, "fusion_weight"] - 0.10) < 1e-3
    # Row 1 alpha should be higher (0.10 + 0.60*1.0 + 0.10*0.5 + 0.10*0.5 = 0.80)
    assert abs(fused_df.at[1, "fusion_weight"] - 0.80) < 1e-3
    assert fused_df.at[1, "fused_temperature"] > fused_df.at[0, "fused_temperature"]


def test_consistency_checks_fallback():
    df = pd.DataFrame({
        "temperature": [20.0],
        "fused_temperature": [95.0],              # Physical bounds violation (> 60C)
        "classical_temperature": [22.0],
        "temperature_rolling_mean": [21.0],
        "temperature_rolling_std": [1.0]
    })
    checked = apply_consistency_checks(df, target_feature="temperature")
    assert checked.at[0, "fallback_used"] == True
    assert checked.at[0, "consistency_status"] == "SAFETY_FALLBACK_APPLIED"
    assert checked.at[0, "final_denoised_value"] == 22.0  # Fell back to classical
