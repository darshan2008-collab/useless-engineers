"""
Standalone Pipeline Runner for Q-SENSE
Runs the complete 11-step pipeline directly from the command line.
"""
import sys
import argparse
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.core.config import settings
from backend.app.models.schemas import ProcessingRunConfig
from backend.app.processing.pipeline import run_complete_denoising_pipeline
from backend.app.core.logging import logger


def main():
    parser = argparse.ArgumentParser(description="Run Q-SENSE complete denoising pipeline")
    parser.add_argument("--input", type=str, default=str(settings.GENERATED_DIR / "noisy_sensor_data.csv"), help="Input noisy CSV")
    parser.add_argument("--ground-truth", type=str, default=str(settings.GENERATED_DIR / "ground_truth.csv"), help="Ground truth CSV (optional)")
    parser.add_argument("--noise-labels", type=str, default=str(settings.GENERATED_DIR / "noise_labels.csv"), help="Noise labels CSV (optional)")
    parser.add_argument("--target-feature", type=str, default="temperature", help="Target sensor feature")
    args = parser.parse_args()

    input_path = Path(args.input)
    gt_path = Path(args.ground_truth) if args.ground_truth and Path(args.ground_truth).exists() else None
    labels_path = Path(args.noise_labels) if args.noise_labels and Path(args.noise_labels).exists() else None

    logger.info(f"Executing Q-SENSE pipeline on: {input_path}")
    cfg = ProcessingRunConfig(target_feature=args.target_feature)

    res = run_complete_denoising_pipeline(
        data=input_path,
        config=cfg,
        ground_truth_data=gt_path,
        noise_labels_data=labels_path
    )

    out_dir = settings.DATA_DIR / "outputs"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / "cli_pipeline_output.csv"
    res.processed_df.to_csv(out_file, index=False)

    print("\n" + "=" * 60)
    print("Q-SENSE PIPELINE EXECUTION SUMMARY")
    print("=" * 60)
    for k, v in res.summary_stats.items():
        if k != "what_changed_summary":
            print(f"{k:28}: {v}")
    print("\nWHAT CHANGED:")
    for stmt in res.summary_stats.get("what_changed_summary", []):
        print(f" - {stmt}")
    print("=" * 60)
    print(f"Output saved to: {out_file}\n")


if __name__ == "__main__":
    main()
