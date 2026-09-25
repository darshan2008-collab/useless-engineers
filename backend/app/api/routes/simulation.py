from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import json

from backend.app.core.config import settings, SimulationConfig
from backend.app.models.database import get_db, Dataset
from backend.app.models.schemas import ApiResponse, SimulationRequest, ErrorItem
from backend.app.simulation.generator import generate_sensor_dataset
from backend.app.services.dataset_service import DatasetService

router = APIRouter(prefix="/simulation", tags=["simulation"])


@router.get("/latest", response_model=ApiResponse)
def get_latest_simulation_metadata(db: Session = Depends(get_db)):
    """
    Fetch the latest generated simulation metadata and dataset info.
    """
    meta_path = settings.GENERATED_DIR / "metadata.json"
    if not meta_path.exists():
        return ApiResponse(
            success=True,
            data=None,
            metadata={"status": "NO_SIMULATION_YET"}
        )

    try:
        with open(meta_path, "r", encoding="utf-8") as f:
            sim_meta = json.load(f)

        # Lookup latest generated dataset in DB
        dataset = (
            db.query(Dataset)
            .filter(Dataset.name == "noisy_sensor_data.csv")
            .order_by(Dataset.created_at.desc())
            .first()
        )

        dataset_data = {
            "dataset_id": dataset.id if dataset else None,
            "name": dataset.name if dataset else "noisy_sensor_data.csv",
            "row_count": dataset.row_count if dataset else sim_meta.get("total_rows", 0),
            "sensor_count": dataset.sensor_count if dataset else sim_meta.get("number_of_sensors", 50),
            "has_ground_truth": True,
            "seed": sim_meta.get("random_seed", 42)
        }

        return ApiResponse(
            success=True,
            data=dataset_data,
            metadata=sim_meta
        )
    except Exception as e:
        return ApiResponse(
            success=False,
            errors=[ErrorItem(code="METADATA_READ_ERROR", message=str(e))]
        )


@router.get("/download/{file_type}")
def download_simulation_file(file_type: str):
    """
    Download synthetic simulation files:
    - noisy: noisy_sensor_data.csv
    - ground_truth: ground_truth.csv
    - labels: noise_labels.csv
    - metadata: metadata.json
    """
    file_map = {
        "noisy": settings.GENERATED_DIR / "noisy_sensor_data.csv",
        "ground_truth": settings.GENERATED_DIR / "ground_truth.csv",
        "labels": settings.GENERATED_DIR / "noise_labels.csv",
        "metadata": settings.GENERATED_DIR / "metadata.json",
    }

    target = file_map.get(file_type.lower())
    if not target or not target.exists():
        raise HTTPException(status_code=404, detail=f"Simulation file '{file_type}' not found or not generated yet")

    media_type = "application/json" if file_type == "metadata" else "text/csv"
    return FileResponse(
        path=target,
        media_type=media_type,
        filename=target.name
    )


@router.post("/generate", response_model=ApiResponse)
def generate_simulation_dataset(
    req: SimulationRequest = SimulationRequest(),
    db: Session = Depends(get_db)
):
    """
    Section 40: Generate deterministic simulated sensor network and register in database.
    """
    try:
        sim_config = SimulationConfig(
            number_of_sensors=req.number_of_sensors,
            duration_hours=req.duration_hours,
            sampling_interval_minutes=req.sampling_interval_minutes,
            random_seed=req.random_seed,
            noise_fractions=req.noise_fractions or settings.simulation.noise_fractions
        )

        gt_path, noisy_path, labels_path, meta_path = generate_sensor_dataset(config=sim_config)

        # Register dataset in database
        dataset = DatasetService.register_uploaded_csv(
            file_path=noisy_path,
            original_filename="noisy_sensor_data.csv",
            db=db,
            ground_truth_path=gt_path,
            noise_labels_path=labels_path
        )

        with open(meta_path, "r", encoding="utf-8") as f:
            sim_meta = json.load(f)

        return ApiResponse(
            success=True,
            data={
                "dataset_id": dataset.id,
                "name": dataset.name,
                "row_count": dataset.row_count,
                "sensor_count": dataset.sensor_count,
                "has_ground_truth": True,
                "seed": req.random_seed
            },
            metadata=sim_meta
        )

    except Exception as e:
        return ApiResponse(
            success=False,
            errors=[ErrorItem(code="SIMULATION_ERROR", message=str(e))]
        )

