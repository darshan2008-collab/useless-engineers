import React, { useState } from "react";
import { CpuIcon, LayersIcon } from "./Icons";

interface QuantumDrawerProps {
  quantumMeta?: {
    num_qubits?: number;
    num_layers?: number;
    num_parameters?: number;
    initial_loss?: number;
    final_loss?: number;
    simulator?: string;
    residual_scale?: number;
    loss_history?: number[];
  };
}

export const QuantumDrawer: React.FC<QuantumDrawerProps> = ({ quantumMeta }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const meta = quantumMeta || {
    num_qubits: 4,
    num_layers: 2,
    num_parameters: 16,
    initial_loss: 0.2523,
    final_loss: 0.0586,
    simulator: "Qiskit Aer / Statevector",
    residual_scale: 1.0,
    loss_history: [0.2523, 0.184, 0.121, 0.089, 0.065, 0.0586],
  };

  return (
    <div className="card" style={{ padding: 18, border: "1px solid #ddd6fe", background: "#fbfaff" }}>
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: "#8b5cf6", color: "#ffffff", padding: "6px 8px", borderRadius: 6 }}>
            <CpuIcon size={16} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#4c1d95" }}>
              Variational Quantum Circuit Architecture & Parameters (Section 50)
            </div>
            <div style={{ fontSize: 11, color: "#6d28d9" }}>
              Parameterized Qiskit Circuit • Angle Encoding • Linear CNOT Topology • Observable: &lt;Z₀&gt;
            </div>
          </div>
        </div>

        <button className="btn btn-outline btn-sm" style={{ borderColor: "#c4b5fd", color: "#5b21b6" }}>
          {isOpen ? "Hide Circuit Details ▲" : "Inspect Quantum Engine ▼"}
        </button>
      </div>

      {isOpen && (
        <div style={{ marginTop: 16, borderTop: "1px solid #ede9fe", paddingTop: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
            <div style={{ background: "#ffffff", padding: 12, borderRadius: 8, border: "1px solid #e9d5ff" }}>
              <div style={{ fontSize: 11, color: "#6b21a8", fontWeight: 600 }}>QUBITS</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#581c87", fontFamily: "var(--font-mono)" }}>
                {meta.num_qubits || 4} Qubits
              </div>
              <div style={{ fontSize: 10, color: "#7e22ce" }}>Angle encoded state: |x⟩</div>
            </div>

            <div style={{ background: "#ffffff", padding: 12, borderRadius: 8, border: "1px solid #e9d5ff" }}>
              <div style={{ fontSize: 11, color: "#6b21a8", fontWeight: 600 }}>VARIATIONAL LAYERS</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#581c87", fontFamily: "var(--font-mono)" }}>
                {meta.num_layers || 2} Layers
              </div>
              <div style={{ fontSize: 10, color: "#7e22ce" }}>{meta.num_parameters || 16} Variational angles (θ)</div>
            </div>

            <div style={{ background: "#ffffff", padding: 12, borderRadius: 8, border: "1px solid #e9d5ff" }}>
              <div style={{ fontSize: 11, color: "#6b21a8", fontWeight: 600 }}>SIMULATOR BACKEND</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#581c87", fontFamily: "var(--font-mono)" }}>
                {meta.simulator || "Qiskit Aer / Statevector"}
              </div>
              <div style={{ fontSize: 10, color: "#7e22ce" }}>Deterministic seed 42</div>
            </div>

            <div style={{ background: "#ffffff", padding: 12, borderRadius: 8, border: "1px solid #e9d5ff" }}>
              <div style={{ fontSize: 11, color: "#6b21a8", fontWeight: 600 }}>TRAINING LOSS (MSE)</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#16a34a", fontFamily: "var(--font-mono)" }}>
                {meta.initial_loss ? `${meta.initial_loss.toFixed(3)} → ${meta.final_loss?.toFixed(3)}` : "Converged"}
              </div>
              <div style={{ fontSize: 10, color: "#15803d" }}>Residual supervised learning</div>
            </div>
          </div>

          <div style={{ background: "#ffffff", padding: 14, borderRadius: 8, border: "1px solid #e9d5ff" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6b21a8", marginBottom: 6 }}>
              Variational Circuit Mathematical Pipeline
            </div>
            <pre className="code-block" style={{ background: "#f5f3ff", color: "#3b0764", fontSize: 11 }}>
{`Input Features: [normalized_value, temporal_difference, rolling_variance, spatial_deviation]
    ↓
Angle Encoding:  Ry(arctan(x_q) * π/2) ⊗ Rz(arctan(x_q) * π/4)
    ↓
Variational Layer 1: [Ry(θ_q,1) ⊗ Rz(ϕ_q,1)] → Entanglement: CNOT(0→1), CNOT(1→2), CNOT(2→3)
    ↓
Variational Layer 2: [Ry(θ_q,2) ⊗ Rz(ϕ_q,2)] → Entanglement: CNOT(0→1), CNOT(1→2), CNOT(2→3)
    ↓
Observable:      O = I ⊗ I ⊗ I ⊗ Z  (Pauli-Z expectation ⟨Z₀⟩ ∈ [-1.0, 1.0])
    ↓
Physical Residual: residual = ⟨Z₀⟩ * scale, constrained to max ± 3.0 * local_std
    ↓
Adaptive Fusion: final = (1 - α) * classical_kalman + α * (noisy + residual)`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
