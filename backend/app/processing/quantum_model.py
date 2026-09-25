from typing import Dict, Any, Tuple, Optional
import numpy as np
import pandas as pd
from backend.app.core.logging import logger
from backend.app.quantum.circuit import build_variational_quantum_circuit
from backend.app.quantum.simulator import QuantumSimulatorRunner
from backend.app.quantum.optimizer import train_variational_quantum_model
from backend.app.processing.quantum_features import prepare_quantum_feature_matrix


class VariationalQuantumDenoisingModel:
    """
    High-level Variational Quantum Denoising Engine.
    Operates in either Training mode (with ground truth) or Inference mode (with learned weights).
    """
    def __init__(
        self,
        num_qubits: int = 4,
        num_layers: int = 2,
        seed: int = 42
    ):
        self.num_qubits = num_qubits
        self.num_layers = num_layers
        self.seed = seed
        self.circuit, self.x_params, self.theta_params, self.observable = build_variational_quantum_circuit(
            num_qubits=num_qubits,
            num_layers=num_layers
        )
        self.runner = QuantumSimulatorRunner(seed=seed)
        self.theta: Optional[np.ndarray] = None
        self.residual_scale: float = 1.0
        self.metadata: Dict[str, Any] = {}

    def train_on_telemetry(
        self,
        noisy_df: pd.DataFrame,
        ground_truth_df: pd.DataFrame,
        target_feature: str = "temperature",
        maxiter: int = 25
    ) -> Dict[str, Any]:
        """
        Section 16: Train VQC on sensor-split data without leakage.
        """
        sensors = noisy_df["sensor_id"].unique()
        rng = np.random.default_rng(self.seed)
        shuffled_sensors = rng.permutation(sensors)

        # 70% train sensors, 30% holdout
        n_train = max(1, int(len(shuffled_sensors) * 0.70))
        train_sensors = set(shuffled_sensors[:n_train])

        train_mask = noisy_df["sensor_id"].isin(train_sensors)
        train_noisy = noisy_df[train_mask]
        train_gt = ground_truth_df[train_mask]

        # Extract features and targets
        X_train = prepare_quantum_feature_matrix(train_noisy, target_feature=target_feature, num_qubits=self.num_qubits)

        # Target residual = ground_truth - noisy
        y_residual = (train_gt[target_feature] - train_noisy[target_feature]).to_numpy(dtype=float)
        # Filter NaNs if any
        valid_idx = np.isfinite(y_residual) & ~np.isnan(X_train).any(axis=1)
        X_train_valid = X_train[valid_idx]
        y_residual_valid = y_residual[valid_idx]

        trained_theta, train_meta = train_variational_quantum_model(
            X_train=X_train_valid,
            y_train_residual=y_residual_valid,
            num_qubits=self.num_qubits,
            num_layers=self.num_layers,
            maxiter=maxiter,
            seed=self.seed
        )

        self.theta = trained_theta
        self.residual_scale = train_meta["residual_scale"]
        self.metadata = train_meta
        return train_meta

    def predict_expectation_values(self, X: np.ndarray) -> np.ndarray:
        """
        Run inference across feature matrix X to compute circuit expectation values.
        """
        if self.theta is None:
            # Default initialized weights if not trained
            rng = np.random.default_rng(self.seed)
            self.theta = rng.uniform(-np.pi, np.pi, size=len(self.theta_params))

        return self.runner.batch_evaluate(
            self.circuit,
            X,
            self.theta,
            self.observable,
            self.x_params,
            self.theta_params
        )
