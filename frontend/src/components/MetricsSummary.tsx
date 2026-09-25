import React from "react";
import type { RunSummary } from "../types";
import {
  DatabaseIcon,
  AlertTriangleIcon,
  RefreshCwIcon,
  CloudIcon,
  ActivityIcon,
  BarChartIcon,
  RadioWaveIcon
} from "./Icons";

interface MetricsSummaryProps {
  summary: RunSummary;
}

export const MetricsSummary: React.FC<MetricsSummaryProps> = ({ summary }) => {
  const hasGt = summary.evaluation_available;

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: "#475569" }}>
            Telemetry Metrics
          </h2>
          <p style={{ fontSize: 11, color: "#64748b" }}>
            Verification against ground truth
          </p>
        </div>

        <span
          className={`badge ${hasGt ? "badge-normal" : "badge-warning"}`}
          style={{ fontSize: 11, padding: "4px 10px", letterSpacing: 0.4 }}
        >
          {hasGt ? "VERIFIED" : "ESTIMATED"}
        </span>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-card-header">
            <div className="summary-label">Total Records</div>
            <div className="summary-icon icon-blue">
              <DatabaseIcon size={14} />
            </div>
          </div>
          <div className="summary-value">{summary.total_records.toLocaleString()}</div>
          <div className="summary-subtext">{summary.sensor_count} IoT stations</div>
        </div>

        <div className="summary-card">
          <div className="summary-card-header">
            <div className="summary-label">Detected Anomalies</div>
            <div className="summary-icon icon-red">
              <AlertTriangleIcon size={14} />
            </div>
          </div>
          <div className="summary-value" style={{ color: "#ef4444" }}>
            {summary.detected_anomalies.toLocaleString()}
          </div>
          <div className="summary-subtext">Flagged events</div>
        </div>

        <div className="summary-card">
          <div className="summary-card-header">
            <div className="summary-label">Corrected Readings</div>
            <div className="summary-icon icon-green">
              <RefreshCwIcon size={14} />
            </div>
          </div>
          <div className="summary-value" style={{ color: "#10b981" }}>
            {summary.corrected_readings.toLocaleString()}
          </div>
          <div className="summary-subtext">Adjusted points</div>
        </div>

        <div className="summary-card">
          <div className="summary-card-header">
            <div className="summary-label">Missing Values Imputed</div>
            <div className="summary-icon icon-amber">
              <CloudIcon size={14} />
            </div>
          </div>
          <div className="summary-value" style={{ color: "#f59e0b" }}>
            {summary.missing_values_count.toLocaleString()}
          </div>
          <div className="summary-subtext">Reconstructed</div>
        </div>

        {hasGt && summary.noise_reduction_percentage !== undefined && (
          <div className="summary-card" style={{ borderColor: "#a7f3d0" }}>
            <div className="summary-card-header">
              <div className="summary-label">Noise Reduction</div>
              <div className="summary-icon icon-teal">
                <ActivityIcon size={14} />
              </div>
            </div>
            <div className="summary-value" style={{ color: "#059669" }}>
              {summary.noise_reduction_percentage.toFixed(1)}%
            </div>
            <div className="summary-subtext">Error eliminated</div>
          </div>
        )}

        {hasGt && summary.rmse_before !== undefined && summary.rmse_after !== undefined && (
          <div className="summary-card">
            <div className="summary-card-header">
              <div className="summary-label">RMSE Before → After</div>
              <div className="summary-icon icon-blue">
                <BarChartIcon size={14} />
              </div>
            </div>
            <div className="summary-value">
              <span style={{ color: "#dc2626" }}>{summary.rmse_before.toFixed(2)}</span>
              <span style={{ fontSize: 15, color: "#94a3b8", margin: "0 6px" }}>→</span>
              <span style={{ color: "#16a34a" }}>{summary.rmse_after.toFixed(2)}</span>
            </div>
            <div className="summary-subtext">Root Mean Square</div>
          </div>
        )}

        {hasGt && summary.mae_before !== undefined && summary.mae_after !== undefined && (
          <div className="summary-card">
            <div className="summary-card-header">
              <div className="summary-label">MAE Before → After</div>
              <div className="summary-icon icon-blue">
                <BarChartIcon size={14} />
              </div>
            </div>
            <div className="summary-value">
              <span style={{ color: "#dc2626" }}>{summary.mae_before.toFixed(2)}</span>
              <span style={{ fontSize: 15, color: "#94a3b8", margin: "0 6px" }}>→</span>
              <span style={{ color: "#16a34a" }}>{summary.mae_after.toFixed(2)}</span>
            </div>
            <div className="summary-subtext">Mean Absolute</div>
          </div>
        )}

        {hasGt && summary.snr_before !== undefined && summary.snr_after !== undefined && (
          <div className="summary-card">
            <div className="summary-card-header">
              <div className="summary-label">Signal-to-Noise (SNR)</div>
              <div className="summary-icon icon-blue">
                <RadioWaveIcon size={14} />
              </div>
            </div>
            <div className="summary-value">
              <span>{summary.snr_before.toFixed(1)} dB</span>
              <span style={{ fontSize: 15, color: "#94a3b8", margin: "0 6px" }}>→</span>
              <span style={{ color: "#2563eb" }}>{summary.snr_after.toFixed(1)} dB</span>
            </div>
            <div className="summary-subtext">Decibels (SNR)</div>
          </div>
        )}
      </div>
    </div>
  );
};

