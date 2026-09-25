import time
from typing import Dict, Any, Tuple, Optional, List
import pandas as pd
import numpy as np

from backend.app.core.config import settings
from backend.app.models.schemas import ProcessingRunConfig
from backend.app.core.logging import logger
from backend.app.processing.validation import validate_csv_data, ValidationResult
from backend.app.processing.preprocessing import handle_missing_values, compute_scalers, normalize_features
from backend.app.processing.temporal_features import generate_temporal_features
from backend.app.processing.spatial_features import generate_spatial_features
from backend.app.processing.anomaly_detection import detect_anomalies
from backend.app.processing.classical_filters import apply_moving_average, apply_gaussian_filter, apply_kalman_filter
from backend.app.processing.quantum_features import prepare_quantum_feature_matrix
from backend.app.processing.quantum_model import VariationalQuantumDenoisingModel
from backend.app.processing.quantum_correction import compute_bounded_quantum_corrections
from backend.app.processing.hybrid_fusion import adaptive_hybrid_fusion
from backend.app.processing.consistency import apply_consistency_checks
from backend.app.processing.evaluation import run_benchmark_comparison


class PipelineExecutionResult:
    def __init__(
        self,
        processed_df: pd.DataFrame,
        summary_stats: Dict[str, Any],
        benchmark_results: Optional[Dict[str, Any]],
        validation_report: Dict[str, Any],
        quantum_metadata: Dict[str, Any],
        runtime_seconds: float
    ):
        self.processed_df = processed_df
        self.summary_stats = summary_stats
        self.benchmark_results = benchmark_results
        self.validation_report = validation_report
        self.quantum_metadata = quantum_metadata
        self.runtime_seconds = runtime_seconds


def run_complete_denoising_pipeline(
    data: Any,
    config: Optional[ProcessingRunConfig] = None,
    ground_truth_data: Optional[Any] = None,
    noise_labels_data: Optional[Any] = None,
    trained_quantum_model: Optional[VariationalQuantumDenoisingModel] = None
) -> PipelineExecutionResult:
    """
    Sections 67, 68 & 75: End-to-end orchestration of the Q-SENSE engine.
    Follows strictly the architectural sequence:
    CSV -> Validation -> Missing Value Imputation -> Normalization -> Temporal Features ->
    Spatial Features -> Anomaly Detection -> Classical Filters -> Quantum Feature Encoding ->
    Variational Quantum Circuit -> Bounded Correction -> Adaptive Hybrid Fusion ->
    Consistency Checks -> Final Clean Telemetry + Provenance -> Evaluation.
    """
    start_time = time.time()
    if config is None:
        config = ProcessingRunConfig()

    logger.info("Step 1: Ingesting and validating sensor data...")
    val_res = validate_csv_data(data)
    if not val_res.is_valid:
        raise ValueError(f"Data validation failed: {val_res.report.get('issues', ['Invalid CSV format'])}")

    df = val_res.cleaned_df
    feature_cols = val_res.feature_columns
    target_feature = config.target_feature if config.target_feature in feature_cols else feature_cols[0]

    # Preserve exact original raw copy
    for feat in feature_cols:
        df[f"original_{feat}"] = df[feat]

    logger.info(f"Step 2: Imputing missing values for features: {feature_cols}...")
    df = handle_missing_values(df, feature_cols)

    logger.info("Step 3: Calculating scalers and robust normalization...")
    scalers = compute_scalers(df, feature_cols)
    df = normalize_features(df, feature_cols, scalers)

    logger.info(f"Step 4: Computing causal temporal features (window={config.temporal_window})...")
    df = generate_temporal_features(df, feature_cols, window=config.temporal_window)

    logger.info(f"Step 5: Computing spatial features (radius={config.spatial_radius_meters}m)...")
    df = generate_spatial_features(df, feature_cols, radius_meters=config.spatial_radius_meters)

    logger.info("Step 6: Running multi-factor anomaly detection...")
    df = detect_anomalies(df, feature_cols)

    logger.info("Step 7: Applying classical baseline filters (Moving Average, Gaussian, Kalman)...")
    df = apply_moving_average(df, feature_cols, window=config.temporal_window)
    df = apply_gaussian_filter(df, feature_cols, sigma=1.5)
    df = apply_kalman_filter(df, feature_cols, process_noise=0.05, measurement_noise=1.0)

    logger.info("Step 8: Encoding features and executing Variational Quantum Model on simulator...")
    quantum_failed = False
    quantum_meta = {}

    try:
        # Check if we should train or use provided model
        quantum_model = trained_quantum_model
        if quantum_model is None:
            quantum_model = VariationalQuantumDenoisingModel(
                num_qubits=config.num_qubits,
                num_layers=config.num_layers,
                seed=config.seed
            )
            # If ground truth was provided, train quantum model on training sensors
            if ground_truth_data is not None:
                gt_df = ground_truth_data if isinstance(ground_truth_data, pd.DataFrame) else pd.read_csv(ground_truth_data)
                train_meta = quantum_model.train_on_telemetry(df, gt_df, target_feature=target_feature)
                quantum_meta.update(train_meta)

        # Prepare feature matrix and run inference
        X_quantum = prepare_quantum_feature_matrix(df, target_feature=target_feature, num_qubits=config.num_qubits)
        expectations = quantum_model.predict_expectation_values(X_quantum)

        quantum_meta.update({
            "num_qubits": config.num_qubits,
            "num_layers": config.num_layers,
            "simulator": "Qiskit Aer / Statevector",
            "seed": config.seed,
            "samples_processed": len(df)
        })

        # Step 9: Compute bounded quantum correction
        df = compute_bounded_quantum_corrections(
            df=df,
            quantum_expectations=expectations,
            residual_scale=quantum_model.residual_scale,
            target_feature=target_feature
        )

    except Exception as e:
        logger.error(f"Quantum processing encountered error: {str(e)}. Triggering graceful fallback to classical filter.")
        quantum_failed = True
        quantum_meta = {"quantum_failed": True, "fallback_reason": str(e)}
        # Safe fallback: quantum correction is zero, so quantum_corrected == noisy
        df["quantum_output"] = 0.0
        df["quantum_correction"] = 0.0
        df["quantum_corrected_value"] = df[target_feature]
        df[f"quantum_corrected_{target_feature}"] = df[target_feature]

    logger.info("Step 10: Computing adaptive hybrid fusion...")
    df = adaptive_hybrid_fusion(df, target_feature=target_feature)

    logger.info("Step 11: Applying spatio-temporal consistency and safety checks...")
    df = apply_consistency_checks(df, target_feature=target_feature)

    runtime_sec = time.time() - start_time
    logger.info(f"Pipeline finished successfully in {runtime_sec:.2f} seconds.")

    # Step 12: Benchmark evaluation if ground truth is available
    benchmark_res = None
    evaluation_available = False
    if ground_truth_data is not None:
        try:
            gt_df = ground_truth_data if isinstance(ground_truth_data, pd.DataFrame) else pd.read_csv(ground_truth_data)
            labels_df = None
            if noise_labels_data is not None:
                labels_df = noise_labels_data if isinstance(noise_labels_data, pd.DataFrame) else pd.read_csv(noise_labels_data)

            benchmark_res = run_benchmark_comparison(
                noisy_df=val_res.cleaned_df,
                ground_truth_df=gt_df,
                processed_df=df,
                noise_labels_df=labels_df,
                target_feature=target_feature,
                runtime_seconds=runtime_sec
            )
            evaluation_available = True
        except Exception as e:
            logger.warning(f"Could not compute ground truth benchmark: {str(e)}")

    # Compute high-level summary stats
    anom_col = "final_anomaly_score"
    anomalies_count = int((df[anom_col] > 0.45).sum()) if anom_col in df.columns else 0
    missing_count = int(sum(df[f"was_missing_originally_{feat}"].sum() for feat in feature_cols if f"was_missing_originally_{feat}" in df.columns))
    corrected_count = int((np.abs(df["final_denoised_value"] - df[target_feature]) > 0.1).sum())

    # Generate Section 47 "What Changed?" summary statements
    largest_dev_idx = np.argmax(np.abs(df["final_denoised_value"] - df[target_feature]))
    largest_dev_sensor = df.at[largest_dev_idx, "sensor_id"]
    largest_correction = float(np.abs(df.at[largest_dev_idx, "final_denoised_value"] - df.at[largest_dev_idx, target_feature]))

    what_changed = [
        f"{anomalies_count} unusual readings were detected across {df['sensor_id'].nunique()} sensors.",
        f"{corrected_count} sensor readings were dynamically corrected by the hybrid engine.",
        f"{missing_count} missing values were reconstructed using spatio-temporal interpolation.",
        f"Sensor {largest_dev_sensor} contained the largest detected deviation.",
        f"The maximum single correction was {largest_correction:.2f} units."
    ]

    summary_stats = {
        "total_records": len(df),
        "sensor_count": df["sensor_id"].nunique(),
        "detected_anomalies": anomalies_count,
        "corrected_readings": corrected_count,
        "missing_values_count": missing_count,
        "evaluation_available": evaluation_available,
        "target_feature": target_feature,
        "what_changed_summary": what_changed
    }

    if benchmark_res:
        summary_stats.update({
            "rmse_before": benchmark_res["raw"]["rmse"],
            "rmse_after": benchmark_res["hybrid_quantum"]["rmse"],
            "mae_before": benchmark_res["raw"]["mae"],
            "mae_after": benchmark_res["hybrid_quantum"]["mae"],
            "snr_before": benchmark_res["raw"]["snr"],
            "snr_after": benchmark_res["hybrid_quantum"]["snr"],
            "noise_reduction_percentage": benchmark_res["hybrid_quantum"]["noise_reduction_percentage"]
        })

    return PipelineExecutionResult(
        processed_df=df,
        summary_stats=summary_stats,
        benchmark_results=benchmark_res,
        validation_report=val_res.report,
        quantum_metadata=quantum_meta,
        runtime_seconds=runtime_sec
    )
