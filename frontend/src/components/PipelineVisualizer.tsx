import React from "react";
import { LayersIcon, CheckCircleIcon } from "./Icons";

export const PipelineVisualizer: React.FC = () => {
  const steps = [
    { num: "01", name: "CSV Validation", desc: "Non-destructive schema & coordinate checks" },
    { num: "02", name: "Preprocessing", desc: "Spatio-temporal missing value imputation" },
    { num: "03", name: "Temporal Features", desc: "Strictly causal rolling windows (window=5)" },
    { num: "04", name: "Spatial Features", desc: "Haversine clustering (radius=500m)" },
    { num: "05", name: "Anomaly Detection", desc: "Temporal, spatial & statistical z-scores" },
    { num: "06", name: "Classical Filters", desc: "Kinematic discrete Kalman, MA, Gaussian" },
    { num: "07", name: "Quantum Circuit", desc: "4-Qubit VQC residual estimation on Aer" },
    { num: "08", name: "Adaptive Fusion", desc: "Dynamic anomaly-weighted alpha fusion" },
    { num: "09", name: "Consistency", desc: "Physical bounds & 3σ safety fallback" },
    { num: "10", name: "Denoised Output", desc: "Clean telemetry with complete provenance" },
  ];

  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="card-header" style={{ marginBottom: 12 }}>
        <div className="card-title">
          <LayersIcon size={16} />
          <span>Processing Pipeline Architecture (Section 51)</span>
        </div>
        <span style={{ fontSize: 11, color: "#64748b" }}>
          Modular, verifiable, end-to-end execution
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
        {steps.map((s, idx) => (
          <div
            key={s.num}
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: "10px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 3,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700, color: "#2563eb" }}>
                STEP {s.num}
              </span>
              <CheckCircleIcon size={13} className="text-green" />
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{s.name}</div>
            <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.3 }}>{s.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
