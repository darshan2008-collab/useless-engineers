from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import pandas as pd
import json

from backend.app.models.database import get_db, ProcessingRun, AnomalyRecord
from backend.app.core.config import settings

router = APIRouter(prefix="/results", tags=["results"])


@router.get("/download/{run_id}")
def download_denoised_csv(run_id: str, db: Session = Depends(get_db)):
    """
    Section 52: Download complete denoised CSV with full provenance fields.
    """
    run = db.query(ProcessingRun).filter(ProcessingRun.id == run_id).first()
    if not run or not run.output_file_path or not Path(run.output_file_path).exists():
        raise HTTPException(status_code=404, detail="Processed file not found")

    return FileResponse(
        path=run.output_file_path,
        media_type="text/csv",
        filename=f"qsense_denoised_{run_id[:8]}.csv"
    )


@router.get("/download-anomalies/{run_id}")
def download_anomalies_csv(run_id: str, db: Session = Depends(get_db)):
    """
    Section 52: Download filtered anomaly audit report CSV.
    """
    records = db.query(AnomalyRecord).filter(AnomalyRecord.run_id == run_id).all()
    if not records:
        raise HTTPException(status_code=404, detail="No anomalies found for this run")

    data = [
        {
            "sensor_id": r.sensor_id,
            "timestamp": r.timestamp,
            "feature": r.feature,
            "original_value": r.original_value,
            "classical_value": r.classical_value,
            "quantum_correction": r.quantum_correction,
            "final_value": r.final_value,
            "anomaly_type": r.anomaly_type,
            "anomaly_score": r.final_score,
            "fusion_weight": r.fusion_weight,
            "fallback_used": r.fallback_used,
            "consistency_status": r.consistency_status
        }
        for r in records
    ]

    df = pd.DataFrame(data)
    temp_path = settings.DATA_DIR / "outputs" / f"anomalies_{run_id[:8]}.csv"
    df.to_csv(temp_path, index=False)

    return FileResponse(
        path=temp_path,
        media_type="text/csv",
        filename=f"qsense_anomalies_{run_id[:8]}.csv"
    )
