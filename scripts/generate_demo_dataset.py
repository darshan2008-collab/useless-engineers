"""
Official Demo Dataset Generator for Q-SENSE (Section 71)
Generates:
- 50 sensors
- 24 hours of readings
- 5-minute sampling interval (14,400 total records)
- Random seed 42
- Injects Gaussian noise, spikes, outliers, drift, missing values, and spatial anomalies.
"""
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.core.config import settings, SimulationConfig
from backend.app.simulation.generator import generate_sensor_dataset
from backend.app.core.logging import logger


def main():
    logger.info("Starting Q-SENSE Demo Dataset Generation...")
    config = SimulationConfig(
        number_of_sensors=50,
        duration_hours=24,
        sampling_interval_minutes=5,
        random_seed=42
    )

    gt_path, noisy_path, labels_path, meta_path = generate_sensor_dataset(config=config)

    print("\n" + "=" * 60)
    print("Q-SENSE DATASET GENERATION COMPLETE")
    print("=" * 60)
    print(f"Ground Truth CSV : {gt_path}")
    print(f"Noisy Telemetry  : {noisy_path}")
    print(f"Noise Labels CSV : {labels_path}")
    print(f"Metadata JSON    : {meta_path}")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
