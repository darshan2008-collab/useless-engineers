import pytest
import pandas as pd
import numpy as np
from backend.app.core.config import settings
from backend.app.models.schemas import ProcessingRunConfig
from backend.app.processing.pipeline import run_complete_denoising_pipeline


def test_complete_pipeline_invariants():
    """
    Section 59: Critical pipeline test verifying all output integrity invariants.
    """
    noisy_path = settings.GENERATED_DIR / "noisy_sensor_data.csv"
    gt_path = settings.GENERATED_DIR / "ground_truth.csv"
    labels_path = settings.GENERATED_DIR / "noise_labels.csv"

    # Ensure official 14,400 row dataset is generated
    from backend.app.simulation.generator import generate_sensor_dataset
    from backend.app.core.config import SimulationConfig
    if not noisy_path.exists() or len(pd.read_csv(noisy_path)) != 14400:
        generate_sensor_dataset(SimulationConfig(number_of_sensors=50, duration_hours=24, sampling_interval_minutes=5, random_seed=42))

    cfg = ProcessingRunConfig(target_feature="temperature", temporal_window=5)

    res = run_complete_denoising_pipeline(
        data=noisy_path,
        config=cfg,
        ground_truth_data=gt_path,
        noise_labels_data=labels_path
    )

    df = res.processed_df

    # 1. Output row count matches
    assert len(df) == 14400
    assert df["sensor_id"].nunique() == 50

    # 2. No unexpected NaNs in final numeric outputs
    assert not df["final_denoised_value"].isna().any()
    assert not df["fusion_weight"].isna().any()
    assert not df["final_anomaly_score"].isna().any()
    assert not df["quantum_correction"].isna().any()

    # 3. Anomaly scores strictly bounded in [0.0, 1.0]
    assert (df["final_anomaly_score"] >= 0.0).all()
    assert (df["final_anomaly_score"] <= 1.0).all()

    # 4. Fusion weights strictly bounded in [0.0, 1.0]
    assert (df["fusion_weight"] >= 0.0).all()
    assert (df["fusion_weight"] <= 1.0).all()

    # 5. Physical bounds satisfied
    assert (df["final_denoised_value"] >= -20.0).all()
    assert (df["final_denoised_value"] <= 60.0).all()

    # 6. Finite metrics
    assert res.benchmark_results is not None
    assert np.isfinite(res.benchmark_results["hybrid_quantum"]["rmse"])
    assert np.isfinite(res.benchmark_results["hybrid_quantum"]["snr"])
