"""
Scientific Benchmark Runner for Q-SENSE (Section 34 & 35)
Runs:
1. Raw Noisy Data
2. Moving Average
3. Gaussian Filter
4. Kalman Filter
5. Hybrid Quantum-Classical
And prints an honest scientific comparison table.
"""
import sys
import argparse
from pathlib import Path
import json

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.core.config import settings
from backend.app.models.schemas import ProcessingRunConfig
from backend.app.processing.pipeline import run_complete_denoising_pipeline
from backend.app.core.logging import logger


def main():
    parser = argparse.ArgumentParser(description="Run Q-SENSE scientific benchmark")
    parser.add_argument("--noisy", type=str, default=str(settings.GENERATED_DIR / "noisy_sensor_data.csv"), help="Noisy telemetry CSV")
    parser.add_argument("--ground-truth", type=str, default=str(settings.GENERATED_DIR / "ground_truth.csv"), help="Clean ground truth CSV")
    parser.add_argument("--noise-labels", type=str, default=str(settings.GENERATED_DIR / "noise_labels.csv"), help="Noise labels CSV")
    parser.add_argument("--feature", type=str, default="temperature", help="Feature to benchmark")
    args = parser.parse_args()

    noisy_path = Path(args.noisy)
    gt_path = Path(args.ground_truth)
    labels_path = Path(args.noise_labels) if Path(args.noise_labels).exists() else None

    logger.info("Executing Q-SENSE benchmark...")
    cfg = ProcessingRunConfig(target_feature=args.feature)

    res = run_complete_denoising_pipeline(
        data=noisy_path,
        config=cfg,
        ground_truth_data=gt_path,
        noise_labels_data=labels_path
    )

    if not res.benchmark_results:
        print("ERROR: Benchmark results could not be computed.")
        return

    b = res.benchmark_results

    print("\n" + "=" * 80)
    print("Q-SENSE SCIENTIFIC BENCHMARK RESULTS")
    print("=" * 80)
    print(f"{'Method':<25} | {'RMSE':<8} | {'MAE':<8} | {'SNR (dB)':<10} | {'Noise Red.':<10} | {'Runtime (s)':<10}")
    print("-" * 80)

    for method_key, method_name in [
        ("raw", "Raw Noisy"),
        ("moving_average", "Moving Average"),
        ("gaussian", "Gaussian Smoothing"),
        ("kalman", "Discrete Kalman"),
        ("hybrid_quantum", "Hybrid Quantum-Classical")
    ]:
        m = b[method_key]
        print(f"{method_name:<25} | {m['rmse']:<8.4f} | {m['mae']:<8.4f} | {m['snr']:<10.2f} | {m['noise_reduction_percentage']:<9.1f}% | {m['runtime_seconds']:<10.3f}")

    print("=" * 80)
    print("\nSCIENTIFIC ASSESSMENT:")
    print(f" - {b['honest_assessment']}\n")

    if b.get("anomaly_detection"):
        ad = b["anomaly_detection"]
        print("ANOMALY DETECTION ACCURACY:")
        print(f" - Precision : {ad['precision']:.4f}")
        print(f" - Recall    : {ad['recall']:.4f}")
        print(f" - F1-Score  : {ad['f1_score']:.4f}")
        print(f" - TP: {ad['true_positives']}, FP: {ad['false_positives']}, FN: {ad['false_negatives']}\n")


if __name__ == "__main__":
    main()
