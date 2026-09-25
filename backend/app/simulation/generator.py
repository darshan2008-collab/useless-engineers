import json
import os
from pathlib import Path
from datetime import datetime, timezone
import pandas as pd
import numpy as np
from typing import Dict, Any, Tuple

from backend.app.core.config import settings, SimulationConfig
from backend.app.core.logging import logger
from backend.app.simulation.ground_truth import generate_sensor_network, generate_clean_telemetry
from backend.app.simulation.noise_models import inject_noise_to_dataset


def run_simulation_quality_checks(
    clean_df: pd.DataFrame,
    noisy_df: pd.DataFrame,
    noise_labels_df: pd.DataFrame,
    expected_sensors: int,
    expected_rows: int
) -> Dict[str, Any]:
    """
    Section 31: Rigorous automated quality checks before accepting generated simulation data.
    """
    issues = []

    # 1. Expected row count
    if len(clean_df) != expected_rows:
        issues.append(f"Row count mismatch: clean_df has {len(clean_df)}, expected {expected_rows}")
    if len(noisy_df) != expected_rows:
        issues.append(f"Row count mismatch: noisy_df has {len(noisy_df)}, expected {expected_rows}")

    # 2. Expected sensor count
    actual_clean_sensors = clean_df["sensor_id"].nunique()
    if actual_clean_sensors != expected_sensors:
        issues.append(f"Sensor count mismatch: found {actual_clean_sensors}, expected {expected_sensors}")

    # 3. Coordinate validity
    lat_min, lat_max = noisy_df["latitude"].min(), noisy_df["latitude"].max()
    lon_min, lon_max = noisy_df["longitude"].min(), noisy_df["longitude"].max()
    if lat_min < -90 or lat_max > 90 or lon_min < -180 or lon_max > 180:
        issues.append(f"Invalid coordinate range: lat [{lat_min}, {lat_max}], lon [{lon_min}, {lon_max}]")

    # 4. Check for presence of all five noise types in labels
    noise_types = set(noise_labels_df["noise_type"].unique())
    required_noise = {"GAUSSIAN_NOISE", "SPIKE", "OUTLIER", "DRIFT", "MISSING"}
    missing_types = required_noise - noise_types
    if missing_types:
        issues.append(f"Missing required noise types: {missing_types}")

    # 5. Missing value presence in noisy data
    missing_count = noisy_df[["temperature", "humidity", "pressure", "air_quality", "noise_level"]].isna().sum().sum()
    if missing_count == 0:
        issues.append("No missing values were injected in noisy dataset")

    # 6. Verify ground truth remains clean (no NaNs in clean_df)
    clean_nans = clean_df.isna().sum().sum()
    if clean_nans > 0:
        issues.append(f"Clean ground truth contains {clean_nans} NaN values")

    if issues:
        raise ValueError(f"Simulation quality checks failed: {'; '.join(issues)}")

    return {
        "status": "PASSED",
        "total_rows": len(noisy_df),
        "total_sensors": actual_clean_sensors,
        "corrupted_labels_count": int(noise_labels_df["is_corrupted"].sum()),
        "missing_values_count": int(missing_count),
        "noise_types_present": sorted(list(noise_types))
    }


def generate_sensor_dataset(
    config: SimulationConfig = None,
    output_dir: Path = None
) -> Tuple[Path, Path, Path, Path]:
    """
    Generate deterministic benchmark dataset and write files:
    - ground_truth.csv
    - noisy_sensor_data.csv
    - noise_labels.csv
    - metadata.json

    Returns paths to the 4 files.
    """
    if config is None:
        config = settings.simulation
    if output_dir is None:
        output_dir = settings.GENERATED_DIR

    output_dir.mkdir(parents=True, exist_ok=True)

    logger.info(f"Generating synthetic sensor dataset with seed {config.random_seed}...")

    # 1. Generate sensor spatial network
    sensors_df = generate_sensor_network(
        num_sensors=config.number_of_sensors,
        seed=config.random_seed
    )

    # 2. Generate clean ground truth telemetry
    clean_df = generate_clean_telemetry(
        sensors_df=sensors_df,
        duration_hours=config.duration_hours,
        sampling_interval_minutes=config.sampling_interval_minutes,
        seed=config.random_seed
    )

    # 3. Inject controlled noise models
    noisy_df, noise_labels_df = inject_noise_to_dataset(
        clean_df=clean_df,
        noise_fractions=config.noise_fractions,
        seed=config.random_seed
    )

    # 4. Perform Section 31 automated quality checks
    expected_rows = config.number_of_sensors * int((config.duration_hours * 60) / config.sampling_interval_minutes)
    quality_report = run_simulation_quality_checks(
        clean_df=clean_df,
        noisy_df=noisy_df,
        noise_labels_df=noise_labels_df,
        expected_sensors=config.number_of_sensors,
        expected_rows=expected_rows
    )
    logger.info(f"Quality checks passed: {quality_report}")

    # 5. Save artifacts
    ground_truth_path = output_dir / "ground_truth.csv"
    noisy_data_path = output_dir / "noisy_sensor_data.csv"
    noise_labels_path = output_dir / "noise_labels.csv"
    metadata_path = output_dir / "metadata.json"

    clean_df.to_csv(ground_truth_path, index=False)
    noisy_df.to_csv(noisy_data_path, index=False)
    noise_labels_df.to_csv(noise_labels_path, index=False)

    metadata = {
        "random_seed": config.random_seed,
        "number_of_sensors": config.number_of_sensors,
        "duration_hours": config.duration_hours,
        "sampling_interval_minutes": config.sampling_interval_minutes,
        "total_rows": len(noisy_df),
        "noise_configuration": config.noise_fractions,
        "feature_configuration": ["temperature", "humidity", "pressure", "air_quality", "noise_level"],
        "dataset_version": "1.0.0",
        "generation_timestamp": datetime.now(timezone.utc).isoformat(),
        "quality_report": quality_report
    }

    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    logger.info(f"Dataset generated successfully in {output_dir}")
    return ground_truth_path, noisy_data_path, noise_labels_path, metadata_path
