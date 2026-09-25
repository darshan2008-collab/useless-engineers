import pytest
import pandas as pd
import numpy as np
from backend.app.core.config import SimulationConfig
from backend.app.simulation.generator import generate_sensor_dataset
from backend.app.simulation.ground_truth import generate_sensor_network, generate_clean_telemetry
from backend.app.simulation.noise_models import inject_noise_to_dataset


def test_simulation_reproducibility(tmp_path):
    """
    Section 58: Critical simulation reproducibility test.
    - seed 42 run twice produces identical data
    - seed 99 produces different data
    - asserts 50 sensors, 24 hours (14,400 records)
    - all five noise types represented
    """
    cfg42 = SimulationConfig(number_of_sensors=50, duration_hours=24, sampling_interval_minutes=5, random_seed=42)

    # Run 1 with seed 42
    dir1 = tmp_path / "run1"
    gt1, noisy1, labels1, meta1 = generate_sensor_dataset(cfg42, output_dir=dir1)
    df_noisy1 = pd.read_csv(noisy1)
    df_gt1 = pd.read_csv(gt1)
    df_labels1 = pd.read_csv(labels1)

    # Assert basic dimensional invariants
    assert len(df_noisy1) == 14400
    assert len(df_gt1) == 14400
    assert df_noisy1["sensor_id"].nunique() == 50
    assert df_gt1["sensor_id"].nunique() == 50

    # Assert coordinates valid
    assert df_noisy1["latitude"].between(-90, 90).all()
    assert df_noisy1["longitude"].between(-180, 180).all()

    # Assert all 5 noise types represented in labels
    types_present = set(df_labels1["noise_type"].unique())
    assert "GAUSSIAN_NOISE" in types_present
    assert "SPIKE" in types_present
    assert "OUTLIER" in types_present
    assert "DRIFT" in types_present
    assert "MISSING" in types_present

    # Run 2 with seed 42 -> must be identical
    dir2 = tmp_path / "run2"
    gt2, noisy2, labels2, meta2 = generate_sensor_dataset(cfg42, output_dir=dir2)
    df_noisy2 = pd.read_csv(noisy2)

    pd.testing.assert_frame_equal(df_noisy1, df_noisy2)

    # Run 3 with seed 99 -> must be different
    cfg99 = SimulationConfig(number_of_sensors=50, duration_hours=24, sampling_interval_minutes=5, random_seed=99)
    dir3 = tmp_path / "run3"
    gt3, noisy3, labels3, meta3 = generate_sensor_dataset(cfg99, output_dir=dir3)
    df_noisy3 = pd.read_csv(noisy3)

    assert not df_noisy1.equals(df_noisy3)
