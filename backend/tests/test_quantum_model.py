import pytest
import numpy as np
import pandas as pd
from backend.app.quantum.circuit import build_variational_quantum_circuit
from backend.app.quantum.simulator import QuantumSimulatorRunner, fast_exact_vqc_expectation_batch
from backend.app.quantum.encoder import extract_quantum_feature_vector, encode_features_to_angles
from backend.app.processing.quantum_correction import compute_bounded_quantum_corrections


def test_quantum_circuit_construction():
    qc, x_params, theta_params, obs = build_variational_quantum_circuit(num_qubits=4, num_layers=2)
    assert qc.num_qubits == 4
    assert len(x_params) == 4
    # 2 layers * 4 qubits * 2 rotation angles (RY, RZ) = 16 variational parameters
    assert len(theta_params) == 16
    assert obs.num_qubits == 4


def test_quantum_simulator_and_batch_eval():
    X = np.array([[0.2, 0.4, -0.1, 0.5], [0.0, 0.0, 0.0, 0.0]])
    theta = np.zeros(16)
    preds = fast_exact_vqc_expectation_batch(X, theta, num_qubits=4, num_layers=2)
    assert len(preds) == 2
    assert (preds >= -1.0).all() and (preds <= 1.0).all()


def test_bounded_quantum_correction():
    df = pd.DataFrame({
        "temperature": [20.0, 22.0],
        "temperature_rolling_std": [1.0, 1.0]
    })
    expectations = np.array([0.5, -0.8])
    corr_df = compute_bounded_quantum_corrections(
        df=df,
        quantum_expectations=expectations,
        residual_scale=2.0,
        target_feature="temperature",
        max_std_multiplier=3.0
    )
    assert "quantum_correction" in corr_df.columns
    assert "quantum_corrected_value" in corr_df.columns
    # Check bounds: 3.0 * 1.0 = 3.0 max magnitude
    assert np.all(np.abs(corr_df["quantum_correction"]) <= 3.0)
