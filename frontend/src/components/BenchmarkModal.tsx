import React from "react";
import type { BenchmarkData } from "../types";
import { BarChartIcon, CheckCircleIcon, AlertTriangleIcon } from "./Icons";

interface BenchmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: BenchmarkData | null;
}

export const BenchmarkModal: React.FC<BenchmarkModalProps> = ({ isOpen, onClose, data }) => {
  if (!isOpen || !data) return null;

  const rows = [
    { name: "Raw Noisy Telemetry", key: "raw", data: data.raw },
    { name: "Moving Average Baseline", key: "moving_average", data: data.moving_average },
    { name: "Gaussian Smoothing Baseline", key: "gaussian", data: data.gaussian },
    { name: "Discrete Kalman Filter Baseline", key: "kalman", data: data.kalman },
    { name: "Hybrid Quantum-Classical (Q-SENSE)", key: "hybrid_quantum", data: data.hybrid_quantum },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 760 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BarChartIcon size={20} className="text-blue" />
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Scientific Algorithm Benchmark</h2>
          </div>
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
          Controlled empirical evaluation against pristine ground truth. No metric fabrication.
        </p>

        <div className="table-container" style={{ marginBottom: 20 }}>
          <table className="benchmark-table">
            <thead>
              <tr>
                <th>Method</th>
                <th>RMSE</th>
                <th>MAE</th>
                <th>SNR (dB)</th>
                <th>Noise Red.</th>
                <th>Runtime</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isHybrid = r.key === "hybrid_quantum";
                return (
                  <tr key={r.key} className={isHybrid ? "highlight-row" : ""}>
                    <td>
                      <strong>{r.name}</strong>
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{r.data.rmse.toFixed(4)}</td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{r.data.mae.toFixed(4)}</td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{r.data.snr.toFixed(2)} dB</td>
                    <td style={{ fontFamily: "var(--font-mono)", color: r.data.noise_reduction_percentage > 0 ? "#16a34a" : "#64748b" }}>
                      {r.data.noise_reduction_percentage.toFixed(1)}%
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{r.data.runtime_seconds.toFixed(3)}s</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ background: "#f8fafc", padding: 14, borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#64748b", marginBottom: 6 }}>
            Scientific Assessment & Finding
          </div>
          <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.5 }}>
            {data.honest_assessment}
          </div>
        </div>

        {data.anomaly_detection && (
          <div style={{ background: "#f1f5f9", padding: 14, borderRadius: 8, border: "1px solid #cbd5e1" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#475569", marginBottom: 8 }}>
              Multi-Factor Anomaly Detection Accuracy (Ground Truth Corruption Labels)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, textAlign: "center" }}>
              <div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Precision</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                  {(data.anomaly_detection.precision * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Recall</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                  {(data.anomaly_detection.recall * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b" }}>F1-Score</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#2563eb" }}>
                  {data.anomaly_detection.f1_score.toFixed(3)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b" }}>True Positives</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#16a34a" }}>
                  {data.anomaly_detection.true_positives}
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
          <button className="btn btn-primary" onClick={onClose}>
            Close Benchmark
          </button>
        </div>
      </div>
    </div>
  );
};
