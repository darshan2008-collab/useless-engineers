from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ErrorItem(BaseModel):
    code: str
    message: str
    field: Optional[str] = None


class ApiResponse(BaseModel):
    success: bool = True
    data: Optional[Any] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    errors: List[ErrorItem] = Field(default_factory=list)


class ValidationReportSchema(BaseModel):
    total_rows: int
    valid_rows: int
    duplicate_rows: int
    invalid_coordinates: int
    invalid_timestamps: int
    missing_sensor_ids: int
    numeric_conversion_errors: int
    is_valid: bool = True
    issues: List[str] = Field(default_factory=list)


class SimulationRequest(BaseModel):
    number_of_sensors: int = 50
    duration_hours: int = 24
    sampling_interval_minutes: int = 5
    random_seed: int = 42
    noise_fractions: Optional[Dict[str, float]] = None


class ProcessingRunConfig(BaseModel):
    spatial_radius_meters: float = 500.0
    temporal_window: int = 5
    temporal_weight: float = 0.35
    spatial_weight: float = 0.40
    statistical_weight: float = 0.25
    num_qubits: int = 4
    num_layers: int = 2
    shots: int = 1024
    seed: int = 42
    base_alpha: float = 0.10
    anomaly_gain: float = 0.60
    spatial_gain: float = 0.20
    temporal_gain: float = 0.20
    max_alpha: float = 0.90
    target_feature: str = "temperature"


class StartProcessingRequest(BaseModel):
    dataset_id: str
    config: Optional[ProcessingRunConfig] = None
    ground_truth_id: Optional[str] = None


class AnomalySummaryItem(BaseModel):
    sensor_id: str
    timestamp: str
    feature: str
    original_value: Optional[float]
    classical_value: Optional[float]
    quantum_correction: Optional[float]
    final_value: Optional[float]
    temporal_score: float
    spatial_score: float
    statistical_score: float
    final_score: float
    anomaly_type: str
    fusion_weight: float
    fallback_used: bool
    fallback_reason: Optional[str] = None
    consistency_status: str


class RunSummaryResponse(BaseModel):
    run_id: str
    dataset_id: str
    status: str
    total_records: int
    detected_anomalies: int
    corrected_readings: int
    missing_values_count: int
    noise_reduction_percentage: Optional[float] = None
    rmse_before: Optional[float] = None
    rmse_after: Optional[float] = None
    mae_before: Optional[float] = None
    mae_after: Optional[float] = None
    snr_before: Optional[float] = None
    snr_after: Optional[float] = None
    evaluation_available: bool = False
    what_changed_summary: List[str] = Field(default_factory=list)
    quantum_metadata: Dict[str, Any] = Field(default_factory=dict)


class BenchmarkMethodMetrics(BaseModel):
    rmse: float
    mae: float
    mse: float
    snr: float
    noise_reduction_percentage: float
    runtime_seconds: float


class AnomalyDetectionMetrics(BaseModel):
    precision: float
    recall: float
    f1_score: float
    true_positives: int
    false_positives: int
    false_negatives: int
    true_negatives: int


class BenchmarkResponseData(BaseModel):
    raw: BenchmarkMethodMetrics
    moving_average: BenchmarkMethodMetrics
    gaussian: BenchmarkMethodMetrics
    kalman: BenchmarkMethodMetrics
    hybrid_quantum: BenchmarkMethodMetrics
    anomaly_detection: Optional[AnomalyDetectionMetrics] = None
    quantum_advantage_demonstrated: bool = False
    honest_assessment: str
