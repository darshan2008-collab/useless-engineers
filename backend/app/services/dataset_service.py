import json
import shutil
from pathlib import Path
from typing import Dict, Any, Optional
import pandas as pd
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.models.database import Dataset, DatasetValidationReport
from backend.app.processing.validation import validate_csv_data


class DatasetService:
    @staticmethod
    def register_uploaded_csv(
        file_path: Path,
        original_filename: str,
        db: Session,
        ground_truth_path: Optional[Path] = None,
        noise_labels_path: Optional[Path] = None
    ) -> Dataset:
        """
        Validate incoming CSV and create persistent database record with audit report.
        """
        val_result = validate_csv_data(file_path)

        dataset = Dataset(
            name=original_filename,
            file_path=str(file_path.resolve()),
            ground_truth_path=str(ground_truth_path.resolve()) if ground_truth_path else None,
            noise_labels_path=str(noise_labels_path.resolve()) if noise_labels_path else None,
            row_count=val_result.report.get("total_rows", 0),
            sensor_count=val_result.cleaned_df["sensor_id"].nunique() if not val_result.cleaned_df.empty else 0,
            has_ground_truth=ground_truth_path is not None,
            metadata_json=json.dumps(val_result.report)
        )
        db.add(dataset)
        db.flush()

        # Add validation report record
        rep = val_result.report
        val_report = DatasetValidationReport(
            dataset_id=dataset.id,
            total_rows=rep.get("total_rows", 0),
            valid_rows=rep.get("valid_rows", 0),
            duplicate_rows=rep.get("duplicate_rows", 0),
            invalid_coordinates=rep.get("invalid_coordinates", 0),
            invalid_timestamps=rep.get("invalid_timestamps", 0),
            missing_sensor_ids=rep.get("missing_sensor_ids", 0),
            numeric_conversion_errors=rep.get("numeric_conversion_errors", 0),
            is_valid=val_result.is_valid,
            details_json=json.dumps(rep)
        )
        db.add(val_report)
        db.commit()
        db.refresh(dataset)

        logger.info(f"Registered dataset {dataset.id} ({dataset.name}) with {dataset.row_count} rows.")
        return dataset

    @staticmethod
    def get_dataset_by_id(dataset_id: str, db: Session) -> Optional[Dataset]:
        return db.query(Dataset).filter(Dataset.id == dataset_id).first()
