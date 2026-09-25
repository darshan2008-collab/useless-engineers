import json
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
import pandas as pd

from backend.app.models.database import get_db, Dataset, ProcessingRun, AnomalyRecord
from backend.app.models.schemas import ApiResponse, StartProcessingRequest, ErrorItem, ProcessingRunConfig
from backend.app.services.processing_service import ProcessingService

router = APIRouter(prefix="/processing", tags=["processing"])


@router.post("/run", response_model=ApiResponse)
def start_processing(
    req: StartProcessingRequest,
    db: Session = Depends(get_db)
):
    """
    Section 40: Start end-to-end Q-SENSE denoising run on a registered dataset.
    """
    dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id).first()
    if not dataset:
        return ApiResponse(
            success=False,
            errors=[ErrorItem(code="DATASET_NOT_FOUND", message=f"Dataset {req.dataset_id} not found")]
        )

    config = req.config or ProcessingRunConfig()

    try:
        run = ProcessingService.execute_run(dataset=dataset, config=config, db=db)
        return ApiResponse(
            success=True,
            data={
                "run_id": run.id,
                "dataset_id": dataset.id,
                "status": run.status,
                "row_count": run.row_count,
                "anomaly_count": run.anomaly_count,
                "evaluation_available": run.evaluation_available
            },
            metadata=json.loads(run.summary_metrics_json) if run.summary_metrics_json else {}
        )
    except Exception as e:
        return ApiResponse(
            success=False,
            errors=[ErrorItem(code="PROCESSING_FAILED", message=str(e))]
        )


@router.get("/{run_id}", response_model=ApiResponse)
def get_run_status(run_id: str, db: Session = Depends(get_db)):
    """
    Section 40: Check processing run status.
    """
    run = db.query(ProcessingRun).filter(ProcessingRun.id == run_id).first()
    if not run:
        return ApiResponse(
            success=False,
            errors=[ErrorItem(code="NOT_FOUND", message=f"Run {run_id} not found")]
        )

    return ApiResponse(
        success=True,
        data={
            "run_id": run.id,
            "status": run.status,
            "row_count": run.row_count,
            "anomaly_count": run.anomaly_count,
            "started_at": run.started_at.isoformat() if run.started_at else None,
            "completed_at": run.completed_at.isoformat() if run.completed_at else None,
            "evaluation_available": run.evaluation_available
        }
    )


@router.get("/{run_id}/summary", response_model=ApiResponse)
def get_run_summary(run_id: str, db: Session = Depends(get_db)):
    """
    Section 40 & 46: Get executive metrics summary and "What Changed?" statements.
    """
    run = db.query(ProcessingRun).filter(ProcessingRun.id == run_id).first()
    if not run:
        return ApiResponse(
            success=False,
            errors=[ErrorItem(code="NOT_FOUND", message=f"Run {run_id} not found")]
        )

    if not run.summary_metrics_json:
        return ApiResponse(
            success=False,
            errors=[ErrorItem(code="NO_SUMMARY", message="Summary metrics not yet generated for this run")]
        )

    summary_data = json.loads(run.summary_metrics_json)
    return ApiResponse(
        success=True,
        data=summary_data,
        metadata={"run_id": run.id, "dataset_id": run.dataset_id}
    )


@router.get("/{run_id}/results", response_model=ApiResponse)
def get_run_results(
    run_id: str,
    sensor_id: Optional[str] = Query(default=None),
    feature: str = Query(default="temperature"),
    db: Session = Depends(get_db)
):
    """
    Section 40 & 44: Synchronized time series data for BEFORE and AFTER charts.
    """
    run = db.query(ProcessingRun).filter(ProcessingRun.id == run_id).first()
    if not run:
        return ApiResponse(
            success=False,
            errors=[ErrorItem(code="NOT_FOUND", message=f"Run {run_id} not found")]
        )

    # If sensor_id is not specified, default to first sensor in file or S001
    target_sensor = sensor_id or "S001"
    series = ProcessingService.get_run_results_for_sensor(run, target_sensor, target_feature=feature)

    return ApiResponse(
        success=True,
        data={
            "sensor_id": target_sensor,
            "feature": feature,
            "series": series
        },
        metadata={"point_count": len(series)}
    )


@router.get("/{run_id}/anomalies", response_model=ApiResponse)
def get_run_anomalies(
    run_id: str,
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Section 40 & 48: Return detected anomalies for the Anomaly Table.
    """
    run = db.query(ProcessingRun).filter(ProcessingRun.id == run_id).first()
    if not run:
        return ApiResponse(
            success=False,
            errors=[ErrorItem(code="NOT_FOUND", message=f"Run {run_id} not found")]
        )

    query = db.query(AnomalyRecord).filter(AnomalyRecord.run_id == run_id).order_by(AnomalyRecord.final_score.desc())
    total_anomalies = query.count()
    records = query.offset(offset).limit(limit).all()

    items = [
        {
            "id": r.id,
            "timestamp": r.timestamp,
            "sensor_id": r.sensor_id,
            "feature": r.feature,
            "original_value": r.original_value,
            "classical_value": r.classical_value,
            "quantum_correction": r.quantum_correction,
            "final_value": r.final_value,
            "anomaly_type": r.anomaly_type,
            "anomaly_score": round(r.final_score, 4),
            "fusion_weight": round(r.fusion_weight, 4),
            "fallback_used": r.fallback_used,
            "consistency_status": r.consistency_status
        }
        for r in records
    ]

    return ApiResponse(
        success=True,
        data=items,
        metadata={"total": total_anomalies, "offset": offset, "limit": limit}
    )


@router.get("/{run_id}/sensors", response_model=ApiResponse)
def get_sensor_spatial_network(
    run_id: str,
    db: Session = Depends(get_db)
):
    """
    Section 49: Sensor map data returning locations, status, and anomaly counts.
    """
    run = db.query(ProcessingRun).filter(ProcessingRun.id == run_id).first()
    if not run:
        return ApiResponse(
            success=False,
            errors=[ErrorItem(code="NOT_FOUND", message=f"Run {run_id} not found")]
        )

    if not run.output_file_path or not Path(run.output_file_path).exists():
        return ApiResponse(success=True, data=[])

    df = pd.read_csv(run.output_file_path)
    sensors_meta = []

    for s_id, group in df.groupby("sensor_id"):
        first_row = group.iloc[0]
        anom_count = int((group["final_anomaly_score"] > 0.45).sum())

        status = "normal"
        if anom_count > 15:
            status = "anomaly"
        elif anom_count > 0:
            status = "warning"

        sensors_meta.append({
            "sensor_id": str(s_id),
            "latitude": float(first_row["latitude"]),
            "longitude": float(first_row["longitude"]),
            "status": status,
            "anomaly_count": anom_count,
            "avg_fusion_weight": round(float(group.get("fusion_weight", pd.Series(0.1)).mean()), 3),
            "mean_denoised": round(float(group["final_denoised_value"].mean()), 2)
        })

    sensors_meta.sort(key=lambda s: s["sensor_id"])
    return ApiResponse(success=True, data=sensors_meta)
