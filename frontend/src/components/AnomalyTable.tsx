import React, { useState } from "react";
import type { AnomalyItem } from "../types";
import { AlertTriangleIcon } from "./Icons";

interface AnomalyTableProps {
  anomalies: AnomalyItem[];
  selectedAnomalyId?: string;
  onSelectAnomaly: (item: AnomalyItem) => void;
}

export const AnomalyTable: React.FC<AnomalyTableProps> = ({
  anomalies,
  selectedAnomalyId,
  onSelectAnomaly,
}) => {
  const [filterType, setFilterType] = useState<string>("ALL");

  const filtered = anomalies.filter((a) => {
    if (filterType === "ALL") return true;
    return a.anomaly_type === filterType;
  });

  const anomalyTypes = ["ALL", ...Array.from(new Set(anomalies.map((a) => a.anomaly_type)))];

  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="card-header anomaly-card-header">
        <div className="card-title">
          <AlertTriangleIcon size={16} />
          <span>Detected Anomalies ({filtered.length})</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <label style={{ fontSize: 12, color: "#64748b" }}>Filter Type:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: "4px 8px",
              borderRadius: 6,
              border: "1px solid #cbd5e1",
              fontSize: 12,
              fontFamily: "inherit",
              background: "#ffffff",
            }}
          >
            {anomalyTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mobile-table-hint show-on-mobile" style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>
        👆 Swipe horizontally to inspect classical & quantum provenance
      </div>

      <div className="table-container" style={{ maxHeight: 360, overflowY: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Sensor</th>
              <th>Original</th>
              <th>Anomaly Type</th>
              <th>Score</th>
              <th>Classical Val</th>
              <th>Quantum Corr</th>
              <th>Final Denoised</th>
              <th>Weight (α)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map((a) => {
              const isSelected = a.id === selectedAnomalyId;
              return (
                <tr
                  key={a.id}
                  className={`clickable ${isSelected ? "selected" : ""}`}
                  onClick={() => onSelectAnomaly(a)}
                >
                  <td style={{ fontFamily: "var(--font-mono)" }}>
                    {a.timestamp.includes(" ") ? a.timestamp.split(" ")[1] : a.timestamp}
                  </td>
                  <td>
                    <strong>{a.sensor_id}</strong>
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)" }}>
                    {a.original_value !== null ? a.original_value.toFixed(2) : "NaN"}
                  </td>
                  <td>
                    <span className="badge badge-anomaly" style={{ fontSize: 10 }}>
                      {a.anomaly_type}
                    </span>
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "#dc2626" }}>
                    {a.anomaly_score.toFixed(3)}
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)" }}>
                    {a.classical_value !== null ? a.classical_value.toFixed(2) : "--"}
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", color: "#7c3aed" }}>
                    {a.quantum_correction !== null ? (a.quantum_correction > 0 ? `+${a.quantum_correction.toFixed(2)}` : a.quantum_correction.toFixed(2)) : "--"}
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#2563eb" }}>
                    {a.final_value !== null ? a.final_value.toFixed(2) : "--"}
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)" }}>
                    {(a.fusion_weight * 100).toFixed(0)}%
                  </td>
                  <td>
                    <span className={`badge ${a.fallback_used ? "badge-warning" : "badge-normal"}`} style={{ fontSize: 10 }}>
                      {a.fallback_used ? "FALLBACK" : "VALID"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
