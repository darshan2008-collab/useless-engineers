import numpy as np
from typing import Dict, Any, Union, List


def calculate_mse(prediction: np.ndarray, ground_truth: np.ndarray) -> float:
    """
    Mean Squared Error: mean((prediction - ground_truth)^2)
    """
    valid_mask = np.isfinite(prediction) & np.isfinite(ground_truth)
    if not np.any(valid_mask):
        return 0.0
    diff = prediction[valid_mask] - ground_truth[valid_mask]
    return float(np.mean(diff ** 2))


def calculate_rmse(prediction: np.ndarray, ground_truth: np.ndarray) -> float:
    """
    Root Mean Squared Error: sqrt(mean((prediction - ground_truth)^2))
    """
    mse = calculate_mse(prediction, ground_truth)
    return float(np.sqrt(mse))


def calculate_mae(prediction: np.ndarray, ground_truth: np.ndarray) -> float:
    """
    Mean Absolute Error: mean(abs(prediction - ground_truth))
    """
    valid_mask = np.isfinite(prediction) & np.isfinite(ground_truth)
    if not np.any(valid_mask):
        return 0.0
    return float(np.mean(np.abs(prediction[valid_mask] - ground_truth[valid_mask])))


def calculate_snr(prediction: np.ndarray, ground_truth: np.ndarray) -> float:
    """
    Signal-to-Noise Ratio (dB): 10 * log10(signal_power / noise_power)
    signal_power = mean(ground_truth^2)
    noise_power = mean((prediction - ground_truth)^2)
    Safe handling of zero or near-zero denominators.
    """
    valid_mask = np.isfinite(prediction) & np.isfinite(ground_truth)
    if not np.any(valid_mask):
        return 0.0

    gt = ground_truth[valid_mask]
    pred = prediction[valid_mask]

    signal_power = np.mean(gt ** 2)
    noise_power = np.mean((pred - gt) ** 2)

    if noise_power <= 1e-12:
        return 100.0  # Perfectly clean signal ceiling
    if signal_power <= 1e-12:
        return -100.0

    ratio = signal_power / noise_power
    return float(10.0 * np.log10(ratio))


def calculate_noise_reduction_percentage(
    error_before: float,
    error_after: float
) -> float:
    """
    Noise reduction percentage: 100 * (1 - error_after / error_before)
    Bounded between -100.0% and 100.0%
    """
    if error_before <= 1e-12:
        return 0.0
    reduction = 100.0 * (1.0 - (error_after / error_before))
    return float(np.clip(reduction, -100.0, 100.0))


def calculate_anomaly_detection_metrics(
    predicted_anomalies: np.ndarray,
    ground_truth_corrupted: np.ndarray
) -> Dict[str, Any]:
    """
    Evaluate precision, recall, and F1 score against ground truth noise labels.
    predicted_anomalies: boolean array or binary 0/1
    ground_truth_corrupted: boolean array or binary 0/1
    """
    pred = np.asarray(predicted_anomalies, dtype=bool)
    gt = np.asarray(ground_truth_corrupted, dtype=bool)

    tp = int(np.sum(pred & gt))
    fp = int(np.sum(pred & (~gt)))
    fn = int(np.sum((~pred) & gt))
    tn = int(np.sum((~pred) & (~gt)))

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (
        2.0 * (precision * recall) / (precision + recall)
        if (precision + recall) > 0
        else 0.0
    )

    return {
        "precision": float(round(precision, 4)),
        "recall": float(round(recall, 4)),
        "f1_score": float(round(f1, 4)),
        "true_positives": tp,
        "false_positives": fp,
        "false_negatives": fn,
        "true_negatives": tn
    }
