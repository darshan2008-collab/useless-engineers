import os
from pathlib import Path
from typing import Dict, Any, List
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class AnomalyWeightsConfig(BaseModel):
    temporal: float = Field(default=0.35, description="Weight for temporal anomaly score")
    spatial: float = Field(default=0.40, description="Weight for spatial anomaly score")
    statistical: float = Field(default=0.25, description="Weight for statistical anomaly score")

    def validate_weights(self) -> bool:
        total = self.temporal + self.spatial + self.statistical
        return abs(total - 1.0) < 1e-4


class QuantumConfig(BaseModel):
    num_qubits: int = Field(default=4, ge=2, le=8, description="Number of qubits for variational circuit")
    num_layers: int = Field(default=2, ge=1, le=6, description="Number of variational layers")
    shots: int = Field(default=1024, ge=128, le=8192, description="Number of measurement shots")
    seed: int = Field(default=42, description="Random seed for deterministic quantum simulator")
    learning_rate: float = Field(default=0.05, description="Learning rate for classical optimizer")
    max_iterations: int = Field(default=30, description="Max training iterations for variational circuit")
    entanglement: str = Field(default="linear", description="Entanglement topology: linear or circular")
    feature_keys: List[str] = Field(
        default=[
            "normalized_current_value",
            "normalized_temporal_difference",
            "normalized_rolling_variance",
            "normalized_spatial_deviation"
        ],
        description="Keys used for quantum feature encoding"
    )


class FusionConfig(BaseModel):
    base_alpha: float = Field(default=0.10, ge=0.0, le=1.0, description="Base quantum fusion weight")
    anomaly_gain: float = Field(default=0.60, ge=0.0, le=2.0, description="Gain factor for anomaly score")
    spatial_gain: float = Field(default=0.20, ge=0.0, le=2.0, description="Gain factor for spatial score")
    temporal_gain: float = Field(default=0.20, ge=0.0, le=2.0, description="Gain factor for temporal score")
    max_alpha: float = Field(default=0.90, ge=0.0, le=1.0, description="Upper ceiling for quantum weight")


class ConsistencyConfig(BaseModel):
    max_correction_std_multiplier: float = Field(default=3.0, description="Maximum correction in local robust STDs")
    enable_physical_bounds: bool = Field(default=True, description="Enforce physical range limits")
    fallback_to_classical: bool = Field(default=True, description="Fallback to classical filter on check failure")


class SimulationConfig(BaseModel):
    number_of_sensors: int = Field(default=50, description="Default number of simulated IoT sensors")
    duration_hours: int = Field(default=24, description="Duration in hours")
    sampling_interval_minutes: int = Field(default=5, description="Sampling interval in minutes")
    random_seed: int = Field(default=42, description="Deterministic simulation seed")
    noise_fractions: Dict[str, float] = Field(
        default={
            "gaussian": 0.05,
            "spike": 0.015,
            "outlier": 0.01,
            "drift": 0.02,
            "missing": 0.015
        },
        description="Fractions of observations affected by various noise types"
    )
    preset: str = Field(default="urban_mesh", description="Hardware simulation profile: urban_mesh, vessel_marine, industrial_stress, edge_mesh")


class PhysicalBoundsConfig(BaseModel):
    temperature: tuple[float, float] = (-20.0, 60.0)      # Celsius
    humidity: tuple[float, float] = (0.0, 100.0)          # % RH
    pressure: tuple[float, float] = (850.0, 1100.0)       # hPa
    air_quality: tuple[float, float] = (0.0, 500.0)       # AQI
    noise_level: tuple[float, float] = (20.0, 140.0)      # dB


class Settings(BaseSettings):
    PROJECT_NAME: str = "Q-SENSE"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    # Base Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    UPLOAD_DIR: Path = BASE_DIR / "data" / "uploads"
    GENERATED_DIR: Path = BASE_DIR / "data" / "generated"

    # Database
    DATABASE_URL: str = Field(
        default=f"sqlite:///{BASE_DIR}/database/qsense.db",
        description="Database connection string (SQLite fallback or PostgreSQL)"
    )

    # Core Algorithm Configurations
    spatial_radius_meters: float = Field(default=500.0, ge=10.0, le=10000.0, description="Spatial search radius in meters")
    temporal_window: int = Field(default=5, ge=3, le=21, description="Rolling window size (3, 5, 7, 11)")
    anomaly_weights: AnomalyWeightsConfig = Field(default_factory=AnomalyWeightsConfig)
    quantum: QuantumConfig = Field(default_factory=QuantumConfig)
    fusion: FusionConfig = Field(default_factory=FusionConfig)
    consistency: ConsistencyConfig = Field(default_factory=ConsistencyConfig)
    simulation: SimulationConfig = Field(default_factory=SimulationConfig)
    physical_bounds: PhysicalBoundsConfig = Field(default_factory=PhysicalBoundsConfig)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


# Instantiate singleton global settings
settings = Settings()

# Ensure required directories exist
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.GENERATED_DIR.mkdir(parents=True, exist_ok=True)
(settings.BASE_DIR / "database").mkdir(parents=True, exist_ok=True)
