import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, create_engine
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from backend.app.core.config import settings

Base = declarative_base()


def generate_uuid() -> str:
    return str(uuid.uuid4())


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    file_path = Column(String(1024), nullable=False)
    ground_truth_path = Column(String(1024), nullable=True)
    noise_labels_path = Column(String(1024), nullable=True)
    row_count = Column(Integer, default=0)
    sensor_count = Column(Integer, default=0)
    has_ground_truth = Column(Boolean, default=False)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    validation_reports = relationship("DatasetValidationReport", back_populates="dataset", cascade="all, delete-orphan")
    runs = relationship("ProcessingRun", back_populates="dataset", cascade="all, delete-orphan")


class DatasetValidationReport(Base):
    __tablename__ = "dataset_validation_reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    dataset_id = Column(String(36), ForeignKey("datasets.id"), nullable=False)
    total_rows = Column(Integer, default=0)
    valid_rows = Column(Integer, default=0)
    duplicate_rows = Column(Integer, default=0)
    invalid_coordinates = Column(Integer, default=0)
    invalid_timestamps = Column(Integer, default=0)
    missing_sensor_ids = Column(Integer, default=0)
    numeric_conversion_errors = Column(Integer, default=0)
    is_valid = Column(Boolean, default=True)
    details_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    dataset = relationship("Dataset", back_populates="validation_reports")


class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    version = Column(String(64), unique=True, nullable=False)
    num_qubits = Column(Integer, nullable=False)
    num_layers = Column(Integer, nullable=False)
    optimizer = Column(String(64), default="COBYLA")
    training_seed = Column(Integer, default=42)
    training_dataset_version = Column(String(64), nullable=True)
    parameters_json = Column(Text, nullable=False)
    scaler_params_json = Column(Text, nullable=True)
    metrics_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    runs = relationship("ProcessingRun", back_populates="model_version")


class ProcessingRun(Base):
    __tablename__ = "processing_runs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    dataset_id = Column(String(36), ForeignKey("datasets.id"), nullable=False)
    model_version_id = Column(String(36), ForeignKey("model_versions.id"), nullable=True)
    configuration_json = Column(Text, nullable=False)
    status = Column(String(32), default="PENDING")  # PENDING, RUNNING, COMPLETED, FAILED
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)
    row_count = Column(Integer, default=0)
    anomaly_count = Column(Integer, default=0)
    error_count = Column(Integer, default=0)
    evaluation_available = Column(Boolean, default=False)
    benchmark_available = Column(Boolean, default=False)
    summary_metrics_json = Column(Text, nullable=True)
    output_file_path = Column(String(1024), nullable=True)

    dataset = relationship("Dataset", back_populates="runs")
    model_version = relationship("ModelVersion", back_populates="runs")
    anomalies = relationship("AnomalyRecord", back_populates="run", cascade="all, delete-orphan")
    benchmarks = relationship("BenchmarkResult", back_populates="run", cascade="all, delete-orphan")
    logs = relationship("ProcessingLog", back_populates="run", cascade="all, delete-orphan")


class AnomalyRecord(Base):
    __tablename__ = "anomalies"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    run_id = Column(String(36), ForeignKey("processing_runs.id"), nullable=False)
    sensor_id = Column(String(64), nullable=False)
    timestamp = Column(String(64), nullable=False)
    feature = Column(String(64), nullable=False)
    original_value = Column(Float, nullable=True)
    imputed_value = Column(Float, nullable=True)
    classical_value = Column(Float, nullable=True)
    quantum_correction = Column(Float, nullable=True)
    quantum_corrected_value = Column(Float, nullable=True)
    final_value = Column(Float, nullable=True)
    temporal_score = Column(Float, default=0.0)
    spatial_score = Column(Float, default=0.0)
    statistical_score = Column(Float, default=0.0)
    final_score = Column(Float, default=0.0)
    anomaly_type = Column(String(64), default="NORMAL")
    fusion_weight = Column(Float, default=0.0)
    fallback_used = Column(Boolean, default=False)
    fallback_reason = Column(String(255), nullable=True)
    consistency_status = Column(String(32), default="VALID")

    run = relationship("ProcessingRun", back_populates="anomalies")


class BenchmarkResult(Base):
    __tablename__ = "benchmark_results"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    run_id = Column(String(36), ForeignKey("processing_runs.id"), nullable=True)
    dataset_id = Column(String(36), ForeignKey("datasets.id"), nullable=False)
    raw_metrics_json = Column(Text, nullable=False)
    moving_average_metrics_json = Column(Text, nullable=False)
    gaussian_metrics_json = Column(Text, nullable=False)
    kalman_metrics_json = Column(Text, nullable=False)
    hybrid_quantum_metrics_json = Column(Text, nullable=False)
    runtime_seconds = Column(Float, default=0.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    run = relationship("ProcessingRun", back_populates="benchmarks")


class ProcessingLog(Base):
    __tablename__ = "processing_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    run_id = Column(String(36), ForeignKey("processing_runs.id"), nullable=False)
    level = Column(String(16), nullable=False)
    message = Column(Text, nullable=False)
    details_json = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    run = relationship("ProcessingRun", back_populates="logs")


# Database engine and session factory
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {},
    echo=False
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
