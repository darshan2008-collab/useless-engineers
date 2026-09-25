import json
from pathlib import Path
from sqlalchemy.orm import Session
import pandas as pd

from backend.app.models.database import BenchmarkResult, Dataset, ProcessingRun
from backend.app.models.schemas import BenchmarkResponseData
from backend.app.processing.evaluation import run_benchmark_comparison
from backend.app.utils.serialization import safe_json_dumps


class BenchmarkService:
    @staticmethod
    def get_or_run_benchmark(
        run: ProcessingRun,
        db: Session
    ) -> BenchmarkResponseData:
        """
        Retrieve existing benchmark result or compute directly from run artifacts.
        """
        # Check if already in DB
        existing = db.query(BenchmarkResult).filter(BenchmarkResult.run_id == run.id).first()
        if existing:
            return BenchmarkResponseData(
                raw=json.loads(existing.raw_metrics_json),
                moving_average=json.loads(existing.moving_average_metrics_json),
                gaussian=json.loads(existing.gaussian_metrics_json),
                kalman=json.loads(existing.kalman_metrics_json),
                hybrid_quantum=json.loads(existing.hybrid_quantum_metrics_json),
                honest_assessment="Loaded from persistent benchmark storage."
            )

        # Parse from run summary metrics if saved
        if run.summary_metrics_json:
            metrics = json.loads(run.summary_metrics_json)
            if "benchmark_results" in metrics and metrics["benchmark_results"]:
                b = metrics["benchmark_results"]
                bench = BenchmarkResult(
                    run_id=run.id,
                    dataset_id=run.dataset_id,
                    raw_metrics_json=json.dumps(b["raw"]),
                    moving_average_metrics_json=json.dumps(b["moving_average"]),
                    gaussian_metrics_json=json.dumps(b["gaussian"]),
                    kalman_metrics_json=json.dumps(b["kalman"]),
                    hybrid_quantum_metrics_json=json.dumps(b["hybrid_quantum"]),
                    runtime_seconds=b["hybrid_quantum"]["runtime_seconds"]
                )
                db.add(bench)
                db.commit()
                return BenchmarkResponseData(**b)

        raise ValueError("Ground truth is not available for this run, so exact benchmark metrics cannot be calculated.")
