import json
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
import pandas as pd
import numpy as np
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.models.database import ProcessingRun, AnomalyRecord, ProcessingLog, Dataset
from backend.app.models.schemas import ProcessingRunConfig
from backend.app.processing.pipeline import run_complete_denoising_pipeline
from backend.app.utils.serialization import safe_json_dumps


class ProcessingService:
    @staticmethod
    def execute_run(
        dataset: Dataset,
        config: ProcessingRunConfig,
        db: Session
    ) -> ProcessingRun:
        """
        Execute end-to-end denoising on a dataset and persist complete provenance.
        """
        run = ProcessingRun(
            dataset_id=dataset.id,
            configuration_json=config.model_dump_json(),
            status="RUNNING",
            started_at=datetime.now(timezone.utc)
        )
        db.add(run)
        db.commit()
        db.refresh(run)

        try:
            # Check ground truth and noise labels if available
            gt_path = Path(dataset.ground_truth_path) if dataset.ground_truth_path else None
            labels_path = Path(dataset.noise_labels_path) if dataset.noise_labels_path else None

            # Execute master pipeline
            pipeline_res = run_complete_denoising_pipeline(
                data=Path(dataset.file_path),
                config=config,
                ground_truth_data=gt_path if gt_path and gt_path.exists() else None,
                noise_labels_data=labels_path if labels_path and labels_path.exists() else None
            )

            df = pipeline_res.processed_df

            # Save processed dataset to file system
            outputs_dir = settings.DATA_DIR / "outputs"
            outputs_dir.mkdir(parents=True, exist_ok=True)
            output_csv_path = outputs_dir / f"denoised_run_{run.id}.csv"
            df.to_csv(output_csv_path, index=False)

            # Extract anomalous records for relational table
            anom_mask = (df["final_anomaly_score"] > 0.45) | (df["fallback_used"] == True)
            anom_df = df[anom_mask]

            anomaly_records = []
            target_feat = config.target_feature
            # Limit stored individual anomaly rows to top 1500 to keep DB snappy
            for _, row in anom_df.head(1500).iterrows():
                anomaly_records.append(
                    AnomalyRecord(
                        run_id=run.id,
                        sensor_id=str(row["sensor_id"]),
                        timestamp=str(row["timestamp"]),
                        feature=target_feat,
                        original_value=float(row.get(f"original_{target_feat}", row[target_feat])),
                        imputed_value=float(row.get(f"imputed_value_{target_feat}", np.nan)) if not np.isnan(row.get(f"imputed_value_{target_feat}", np.nan)) else None,
                        classical_value=float(row.get(f"classical_{target_feat}", row.get(f"kalman_{target_feat}", 0.0))),
                        quantum_correction=float(row.get(f"quantum_correction_{target_feat}", 0.0)),
                        quantum_corrected_value=float(row.get(f"quantum_corrected_{target_feat}", 0.0)),
                        final_value=float(row["final_denoised_value"]),
                        temporal_score=float(row.get("temporal_anomaly_score", 0.0)),
                        spatial_score=float(row.get("spatial_anomaly_score", 0.0)),
                        statistical_score=float(row.get("statistical_anomaly_score", 0.0)),
                        final_score=float(row.get("final_anomaly_score", 0.0)),
                        anomaly_type=str(row.get("anomaly_type", "UNKNOWN")),
                        fusion_weight=float(row.get("fusion_weight", 0.0)),
                        fallback_used=bool(row.get("fallback_used", False)),
                        fallback_reason=str(row.get("fallback_reason", "NONE")),
                        consistency_status=str(row.get("consistency_status", "VALID"))
                    )
                )

            if anomaly_records:
                db.bulk_save_objects(anomaly_records)

            # Update run record
            run.status = "COMPLETED"
            run.completed_at = datetime.now(timezone.utc)
            run.row_count = len(df)
            run.anomaly_count = int(anom_mask.sum())
            run.output_file_path = str(output_csv_path.resolve())
            run.evaluation_available = pipeline_res.summary_stats.get("evaluation_available", False)
            run.summary_metrics_json = safe_json_dumps({
                **pipeline_res.summary_stats,
                "quantum_metadata": pipeline_res.quantum_metadata,
                "benchmark_results": pipeline_res.benchmark_results
            })

            # Add execution log
            db.add(
                ProcessingLog(
                    run_id=run.id,
                    level="INFO",
                    message=f"Pipeline executed successfully in {pipeline_res.runtime_seconds:.2f}s."
                )
            )

            db.commit()
            db.refresh(run)
            return run

        except Exception as e:
            logger.exception(f"Processing run {run.id} failed: {str(e)}")
            run.status = "FAILED"
            run.completed_at = datetime.now(timezone.utc)
            run.error_count = 1
            db.add(
                ProcessingLog(
                    run_id=run.id,
                    level="ERROR",
                    message=f"Pipeline failed: {str(e)}"
                )
            )
            db.commit()
            db.refresh(run)
            raise e

    @staticmethod
    def get_run_results_for_sensor(
        run: ProcessingRun,
        sensor_id: str,
        target_feature: str = "temperature"
    ) -> List[Dict[str, Any]]:
        """
        Extract time series data for a specific sensor for the synchronized Before/After charts.
        """
        if not run.output_file_path or not Path(run.output_file_path).exists():
            return []

        df = pd.read_csv(run.output_file_path)
        sensor_df = df[df["sensor_id"] == sensor_id].sort_values(by="timestamp")

        series_data = []
        for _, row in sensor_df.iterrows():
            orig_val = float(row[f"original_{target_feature}"]) if f"original_{target_feature}" in row and not np.isnan(row[f"original_{target_feature}"]) else (float(row[target_feature]) if not np.isnan(row[target_feature]) else None)
            denoised_val = float(row["final_denoised_value"]) if not np.isnan(row["final_denoised_value"]) else None
            classical_val = float(row[f"classical_{target_feature}"]) if f"classical_{target_feature}" in row and not np.isnan(row[f"classical_{target_feature}"]) else None
            q_corr = float(row["quantum_correction"]) if "quantum_correction" in row and not np.isnan(row["quantum_correction"]) else None
            anom_score = float(row["final_anomaly_score"]) if "final_anomaly_score" in row and not np.isnan(row["final_anomaly_score"]) else 0.0

            series_data.append({
                "timestamp": str(row["timestamp"]),
                "sensor_id": str(row["sensor_id"]),
                "original_value": orig_val,
                "denoised_value": denoised_val,
                "classical_value": classical_val,
                "quantum_correction": q_corr,
                "fusion_weight": float(row.get("fusion_weight", 0.0)),
                "anomaly_score": anom_score,
                "anomaly_type": str(row.get("anomaly_type", "NORMAL")),
                "is_anomaly": anom_score > 0.45,
                "fallback_used": bool(row.get("fallback_used", False))
            })

        return series_data
