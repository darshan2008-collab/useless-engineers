from typing import List, Optional, Tuple
import numpy as np
from qiskit import QuantumCircuit
from qiskit.circuit import ParameterVector
from qiskit.quantum_info import SparsePauliOp


def build_variational_quantum_circuit(
    num_qubits: int = 4,
    num_layers: int = 2,
    entanglement: str = "linear"
) -> Tuple[QuantumCircuit, ParameterVector, ParameterVector, SparsePauliOp]:
    """
    Section 15: Parameterized Variational Quantum Circuit (VQC) for residual prediction.
    Features:
    - Input feature parameters vector x
    - Variational weights parameter vector theta
    - Linear or ring entanglement topology
    - Observable: SparsePauliOp (Pauli-Z on qubit 0)
    """
    qc = QuantumCircuit(num_qubits)

    # 1. Feature encoding parameters
    x_params = ParameterVector("x", num_qubits)
    # 2. Variational weights parameters: 2 rotation angles (RY, RZ) per qubit per layer
    num_weights = num_layers * num_qubits * 2
    theta_params = ParameterVector("theta", num_weights)

    # Layer 0: Feature Angle Encoding
    for q in range(num_qubits):
        qc.ry(x_params[q], q)
        qc.rz(x_params[q] * 0.5, q)

    # Variational Layers
    w_idx = 0
    for l in range(num_layers):
        qc.barrier()
        # Parameterized rotation layer
        for q in range(num_qubits):
            qc.ry(theta_params[w_idx], q)
            w_idx += 1
            qc.rz(theta_params[w_idx], q)
            w_idx += 1

        # Entanglement layer
        if entanglement == "circular" or entanglement == "ring":
            for q in range(num_qubits):
                qc.cx(q, (q + 1) % num_qubits)
        else:  # default linear
            for q in range(num_qubits - 1):
                qc.cx(q, q + 1)

    # Observable: Pauli Z on first qubit, Identity on others (e.g. "IIIZ")
    pauli_str = "I" * (num_qubits - 1) + "Z"
    observable = SparsePauliOp(pauli_str)

    return qc, x_params, theta_params, observable
