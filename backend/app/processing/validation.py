from pathlib import Path
from typing import Dict, Any, List, Tuple
import pandas as pd
import numpy as np


class ValidationResult:
    def __init__(
        self,
        is_valid: bool,
        report: Dict[str, Any],
        cleaned_df: pd.DataFrame,
        feature_columns: List[str]
    ):
        self.is_valid = is_valid
        self.report = report
        self.cleaned_df = cleaned_df
        self.feature_columns = feature_columns


def validate_csv_data(
    file_path_or_df: Any,
    required_cols: List[str] = None
) -> ValidationResult:
    """
    Section 5: Strict, non-destructive validation of incoming telemetry data.
    Generates a full validation audit report.
    """
    if required_cols is None:
        required_cols = ["sensor_id", "timestamp", "latitude", "longitude"]

    # 1. Parse DataFrame
    if isinstance(file_path_or_df, (str, Path)):
        p = Path(file_path_or_df)
        if not p.exists() or not p.is_file():
            raise FileNotFoundError(f"Data file does not exist: {p}")
        try:
            df = pd.read_csv(p)
        except Exception as e:
            raise ValueError(f"Failed to parse CSV file: {str(e)}")
    elif isinstance(file_path_or_df, pd.DataFrame):
        df = file_path_or_df.copy()
    else:
        raise TypeError("Input must be a file path or a pandas DataFrame")

    total_rows = len(df)
    issues: List[str] = []

    # 2. Check required structural columns
    missing_required = [c for c in required_cols if c not in df.columns]
    if missing_required:
        return ValidationResult(
            is_valid=False,
            report={
                "total_rows": total_rows,
                "valid_rows": 0,
                "missing_required_columns": missing_required,
                "is_valid": False,
                "issues": [f"Missing required columns: {missing_required}"]
            },
            cleaned_df=pd.DataFrame(),
            feature_columns=[]
        )

    # 3. Identify numeric sensor features dynamically (Section 4)
    reserved_cols = {"sensor_id", "timestamp", "latitude", "longitude"}
    candidate_features = [c for c in df.columns if c not in reserved_cols]

    feature_cols = []
    numeric_conversion_errors = 0

    for col in candidate_features:
        # Check if column is or can be numeric
        converted = pd.to_numeric(df[col], errors="coerce")
        # If at least some non-null values are numeric, accept as feature
        if converted.notna().sum() > 0:
            feature_cols.append(col)
            # Count conversion errors (non-numeric strings that became NaN)
            original_non_null = df[col].notna().sum()
            converted_non_null = converted.notna().sum()
            numeric_conversion_errors += int(original_non_null - converted_non_null)
            df[col] = converted

    if not feature_cols:
        return ValidationResult(
            is_valid=False,
            report={
                "total_rows": total_rows,
                "valid_rows": 0,
                "is_valid": False,
                "issues": ["At least one numeric sensor feature must be present in the dataset"]
            },
            cleaned_df=pd.DataFrame(),
            feature_columns=[]
        )

    # 4. Check missing sensor IDs
    missing_sensor_mask = df["sensor_id"].isna() | (df["sensor_id"].astype(str).str.strip() == "")
    missing_sensor_ids = int(missing_sensor_mask.sum())

    # 5. Check coordinate validity
    lat = pd.to_numeric(df["latitude"], errors="coerce")
    lon = pd.to_numeric(df["longitude"], errors="coerce")
    invalid_coord_mask = lat.isna() | lon.isna() | (lat < -90.0) | (lat > 90.0) | (lon < -180.0) | (lon > 180.0)
    invalid_coordinates = int(invalid_coord_mask.sum())

    # 6. Check timestamps
    ts_converted = pd.to_datetime(df["timestamp"], errors="coerce")
    invalid_ts_mask = ts_converted.isna()
    invalid_timestamps = int(invalid_ts_mask.sum())

    # 7. Check duplicate rows and duplicate sensor/timestamp
    duplicate_rows = int(df.duplicated().sum())
    duplicate_sensor_ts_mask = df.duplicated(subset=["sensor_id", "timestamp"], keep="first")
    duplicate_sensor_ts = int(duplicate_sensor_ts_mask.sum())

    # Filter invalid structural rows
    drop_mask = missing_sensor_mask | invalid_coord_mask | invalid_ts_mask | duplicate_sensor_ts_mask
    valid_rows = int(total_rows - drop_mask.sum())

    cleaned_df = df[~drop_mask].copy()
    cleaned_df["timestamp"] = ts_converted[~drop_mask].dt.strftime("%Y-%m-%d %H:%M:%S")
    cleaned_df["sensor_id"] = cleaned_df["sensor_id"].astype(str)
    cleaned_df.sort_values(by=["sensor_id", "timestamp"], inplace=True)
    cleaned_df.reset_index(drop=True, inplace=True)

    report = {
        "total_rows": total_rows,
        "valid_rows": valid_rows,
        "duplicate_rows": duplicate_rows,
        "duplicate_sensor_timestamp": duplicate_sensor_ts,
        "invalid_coordinates": invalid_coordinates,
        "invalid_timestamps": invalid_timestamps,
        "missing_sensor_ids": missing_sensor_ids,
        "numeric_conversion_errors": numeric_conversion_errors,
        "is_valid": valid_rows > 0,
        "detected_feature_columns": feature_cols
    }

    return ValidationResult(
        is_valid=(valid_rows > 0),
        report=report,
        cleaned_df=cleaned_df,
        feature_columns=feature_cols
    )
