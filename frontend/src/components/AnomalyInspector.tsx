import React from "react";
import type { TimeSeriesPoint } from "../types";
import { AlertTriangleIcon, CheckCircleIcon, CpuIcon } from "./Icons";

interface AnomalyInspectorProps {
  point: TimeSeriesPoint | null;
  onClear: () => void;
}

export const AnomalyInspector: React.FC<AnomalyInspectorProps> = ({ point, onClear }) => {
  if (!point) {
    return (
      <div className="card" style={{ padding: "14px 18px", color: "#64748b", fontSize: 13, background: "#f8fafc" }}>
        <span>Click on any point or anomaly on the charts or table above to inspect the mathematical provenance and correction factors.</span>
      </div>
    );
  }

  const correction = point.original_value !== null && point.denoised_value !== null
    ? (point.denoised_value - point.original_value)
    : 0;

  return (
    <div className="card" style={{ borderLeft: point.is_anomaly ? "4px solid #ef4444" : "4px solid #10b981", background: "#ffffff" }}>
      <div className="card-header" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {point.is_anomaly ? (
            <AlertTriangleIcon size={18} className="text-red" />
          ) : (
            <CheckCircleIcon size={18} className="text-green" />
          )}
          <span style={{ fontWeight: 700, fontSize: 14 }}>
            Point Provenance Inspector: Sensor {point.sensor_id} @ {point.timestamp}
          </span>
          <span className={`badge ${point.is_anomaly ? "badge-anomaly" : "badge-normal"}`}>
            {point.anomaly_type}
          </span>
        </div>
        <button className="btn btn-outline btn-sm" onClick={onClear}>
          Close
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>ORIGINAL VALUE</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", fontFamily: "var(--font-mono)" }}>
            {point.original_value !== null ? point.original_value.toFixed(2) : "NaN"}
          </div>
        </div>

        <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>FINAL DENOISED</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#2563eb", fontFamily: "var(--font-mono)" }}>
            {point.denoised_value !== null ? point.denoised_value.toFixed(2) : "NaN"}
          </div>
        </div>

        <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>TOTAL CORRECTION</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: correction > 0 ? "#16a34a" : "#dc2626", fontFamily: "var(--font-mono)" }}>
            {correction > 0 ? `+${correction.toFixed(2)}` : correction.toFixed(2)}
          </div>
        </div>

        <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>ANOMALY SCORE</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: point.anomaly_score > 0.45 ? "#ef4444" : "#10b981", fontFamily: "var(--font-mono)" }}>
            {point.anomaly_score.toFixed(3)}
          </div>
        </div>

        <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>CLASSICAL FILTER</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#475569", fontFamily: "var(--font-mono)" }}>
            {point.classical_value !== null ? point.classical_value.toFixed(2) : "--"}
          </div>
        </div>

        <div style={{ background: "#f5f3ff", padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd6fe" }}>
          <div style={{ fontSize: 11, color: "#7c3aed", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
            <CpuIcon size={12} />
            <span>QUANTUM RESIDUAL</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#6d28d9", fontFamily: "var(--font-mono)" }}>
            {point.quantum_correction !== null ? (point.quantum_correction > 0 ? `+${point.quantum_correction.toFixed(2)}` : point.quantum_correction.toFixed(2)) : "--"}
          </div>
        </div>

        <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>FUSION WEIGHT (α)</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", fontFamily: "var(--font-mono)" }}>
            {(point.fusion_weight * 100).toFixed(1)}% Q
          </div>
        </div>
      </div>
    </div>
  );
};
