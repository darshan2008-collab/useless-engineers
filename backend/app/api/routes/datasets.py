import shutil
from pathlib import Path
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
import json

from backend.app.core.config import settings
from backend.app.models.database import get_db, Dataset
from backend.app.models.schemas import ApiResponse, ErrorItem
from backend.app.services.dataset_service import DatasetService

router = APIRouter(prefix="/datasets", tags=["datasets"])


@router.post("/upload", response_model=ApiResponse)
async def upload_dataset(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Section 40: Upload CSV sensor telemetry dataset.
    """
    if not file.filename.endswith(".csv"):
        return ApiResponse(
            success=False,
            errors=[ErrorItem(code="INVALID_FILE_TYPE", message="Uploaded file must be a CSV format")]
        )

    file_path = settings.UPLOAD_DIR / file.filename
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        dataset = DatasetService.register_uploaded_csv(
            file_path=file_path,
            original_filename=file.filename,
            db=db
        )

        return ApiResponse(
            success=True,
            data={
                "dataset_id": dataset.id,
                "name": dataset.name,
                "row_count": dataset.row_count,
                "sensor_count": dataset.sensor_count,
                "has_ground_truth": dataset.has_ground_truth
            },
            metadata=json.loads(dataset.metadata_json) if dataset.metadata_json else {}
        )
    except Exception as e:
        return ApiResponse(
            success=False,
            errors=[ErrorItem(code="UPLOAD_ERROR", message=str(e))]
        )


@router.get("/list", response_model=ApiResponse)
def list_datasets(db: Session = Depends(get_db)):
    """
    List registered datasets.
    """
    datasets = db.query(Dataset).order_by(Dataset.created_at.desc()).all()
    data = [
        {
            "id": d.id,
            "name": d.name,
            "row_count": d.row_count,
            "sensor_count": d.sensor_count,
            "has_ground_truth": d.has_ground_truth,
            "created_at": d.created_at.isoformat() if d.created_at else None
        }
        for d in datasets
    ]
    return ApiResponse(success=True, data=data)


@router.get("/{dataset_id}", response_model=ApiResponse)
def get_dataset(dataset_id: str, db: Session = Depends(get_db)):
    """
    Get dataset metadata and validation report.
    """
    dataset = DatasetService.get_dataset_by_id(dataset_id, db)
    if not dataset:
        return ApiResponse(
            success=False,
            errors=[ErrorItem(code="NOT_FOUND", message=f"Dataset {dataset_id} not found")]
        )

    return ApiResponse(
        success=True,
        data={
            "id": dataset.id,
            "name": dataset.name,
            "row_count": dataset.row_count,
            "sensor_count": dataset.sensor_count,
            "has_ground_truth": dataset.has_ground_truth,
            "created_at": dataset.created_at.isoformat() if dataset.created_at else None
        },
        metadata=json.loads(dataset.metadata_json) if dataset.metadata_json else {}
    )
