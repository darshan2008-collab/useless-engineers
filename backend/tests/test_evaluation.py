import pytest
import numpy as np
from backend.app.utils.metrics import (
    calculate_mse,
    calculate_rmse,
    calculate_mae,
    calculate_snr,
    calculate_noise_reduction_percentage,
    calculate_anomaly_detection_metrics
)


def test_metrics_formulas():
    gt = np.array([10.0, 20.0, 30.0])
    pred = np.array([12.0, 19.0, 31.0])

    # Diff: [2.0, -1.0, 1.0] -> squared: [4, 1, 1] -> mean: 2.0
    assert abs(calculate_mse(pred, gt) - 2.0) < 1e-4
    assert abs(calculate_rmse(pred, gt) - np.sqrt(2.0)) < 1e-4
    # abs diff: [2, 1, 1] -> mean: 4/3
    assert abs(calculate_mae(pred, gt) - (4.0 / 3.0)) < 1e-4

    # Noise reduction: before 4.0, after 2.0 -> 50%
    assert abs(calculate_noise_reduction_percentage(4.0, 2.0) - 50.0) < 1e-4


def test_anomaly_detection_metrics():
    # 2 true anomalies, 2 clean
    gt_corrupted = np.array([True, True, False, False])
    pred_anom = np.array([True, False, True, False])

    # TP: 1 (idx 0), FN: 1 (idx 1), FP: 1 (idx 2), TN: 1 (idx 3)
    res = calculate_anomaly_detection_metrics(pred_anom, gt_corrupted)
    assert res["true_positives"] == 1
    assert res["false_positives"] == 1
    assert res["precision"] == 0.5
    assert res["recall"] == 0.5
    assert res["f1_score"] == 0.5
