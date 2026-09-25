from typing import Dict, Any, Tuple, List
import numpy as np
from scipy.optimize import minimize
from backend.app.core.logging import logger
from backend.app.quantum.circuit import build_variational_quantum_circuit
from backend.app.quantum.simulator import QuantumSimulatorRunner


def train_variational_quantum_model(
    X_train: np.ndarray,
    y_train_residual: np.ndarray,
    num_qubits: int = 4,
    num_layers: int = 2,
    maxiter: int = 25,
    seed: int = 42
) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Section 16: Supervised variational quantum optimization to predict residual = ground_truth - noisy.
    Uses COBYLA optimizer to minimize Mean Squared Error.
    """
    logger.info(f"Training VQC with {num_qubits} qubits, {num_layers} layers on {len(X_train)} samples...")

    circuit, x_params, theta_params, observable = build_variational_quantum_circuit(
        num_qubits=num_qubits,
        num_layers=num_layers
    )

    runner = QuantumSimulatorRunner(seed=seed)
    num_weights = len(theta_params)

    # Deterministic initial weights
    rng = np.random.default_rng(seed)
    init_theta = rng.uniform(-np.pi, np.pi, size=num_weights)

    # Subsample if X_train is large to keep training prompt and fast (e.g. 150 points for quick convergence)
    train_size = min(len(X_train), 150)
    sub_indices = rng.choice(len(X_train), size=train_size, replace=False)
    X_sub = X_train[sub_indices]
    y_sub = y_train_residual[sub_indices]

    # Target scaling: expectation value is in [-1.0, 1.0].
    # Scale residuals into [-0.9, 0.9] range during training
    residual_scale = float(np.max(np.abs(y_sub)))
    if residual_scale < 1e-4:
        residual_scale = 1.0
    y_scaled = y_sub / residual_scale

    loss_history = []

    def objective(theta: np.ndarray) -> float:
        preds = runner.batch_evaluate(circuit, X_sub, theta, observable, x_params, theta_params)
        mse = float(np.mean((preds - y_scaled) ** 2))
        loss_history.append(round(mse, 5))
        return mse

    # Run COBYLA classical optimizer
    res = minimize(
        objective,
        init_theta,
        method="COBYLA",
        options={"maxiter": maxiter, "disp": False}
    )

    trained_theta = res.x
    initial_loss = loss_history[0] if loss_history else 0.0
    final_loss = float(res.fun)

    metadata = {
        "num_qubits": num_qubits,
        "num_layers": num_layers,
        "num_parameters": num_weights,
        "iterations": len(loss_history),
        "initial_loss": initial_loss,
        "final_loss": round(final_loss, 5),
        "residual_scale": round(residual_scale, 4),
        "converged": bool(res.success or final_loss < initial_loss),
        "loss_history": loss_history[:15]  # first 15 steps for summary
    }

    logger.info(f"Quantum optimization finished. Initial MSE: {initial_loss:.4f} -> Final MSE: {final_loss:.4f}")
    return trained_theta, metadata
