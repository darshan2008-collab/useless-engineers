import React, { useRef, useEffect, useState, useMemo } from "react";
import type { TimeSeriesPoint } from "../types";

interface SynchronizedChartsProps {
  points: TimeSeriesPoint[];
  selectedSensorId: string;
  targetFeature: string;
  selectedTimestamp: string | null;
  onSelectPoint: (point: TimeSeriesPoint) => void;
}

export const SynchronizedCharts: React.FC<SynchronizedChartsProps> = ({
  points,
  selectedSensorId,
  targetFeature,
  selectedTimestamp,
  onSelectPoint,
}) => {
  const beforeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const afterCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Compute uniform min and max across BOTH noisy and denoised signals
  const { minVal, maxVal } = useMemo(() => {
    if (!points || points.length === 0) return { minVal: 0, maxVal: 50 };

    let min = Infinity;
    let max = -Infinity;

    for (const p of points) {
      if (p.original_value !== null && !isNaN(p.original_value)) {
        if (p.original_value < min) min = p.original_value;
        if (p.original_value > max) max = p.original_value;
      }
      if (p.denoised_value !== null && !isNaN(p.denoised_value)) {
        if (p.denoised_value < min) min = p.denoised_value;
        if (p.denoised_value > max) max = p.denoised_value;
      }
    }

    if (!isFinite(min) || !isFinite(max)) return { minVal: 0, maxVal: 50 };

    const padding = (max - min) * 0.1 || 2.0;
    return {
      minVal: Math.floor(min - padding),
      maxVal: Math.ceil(max + padding),
    };
  }, [points]);

  // Selected index from prop
  const selectedIndex = useMemo(() => {
    if (!selectedTimestamp) return null;
    return points.findIndex((p) => p.timestamp === selectedTimestamp);
  }, [points, selectedTimestamp]);

  // Render chart helper
  const drawChart = (
    canvas: HTMLCanvasElement,
    mode: "before" | "after",
    activeIndex: number | null
  ) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    if (points.length < 2) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "13px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No telemetry data loaded for this sensor", width / 2, height / 2);
      return;
    }

    const paddingLeft = 45;
    const paddingRight = 15;
    const paddingTop = 20;
    const paddingBottom = 30;

    const plotW = width - paddingLeft - paddingRight;
    const plotH = height - paddingTop - paddingBottom;

    // Coordinate conversion
    const getX = (i: number) => paddingLeft + (i / (points.length - 1)) * plotW;
    const getY = (val: number | null) => {
      if (val === null || isNaN(val)) return paddingTop + plotH / 2;
      const normalized = (val - minVal) / (maxVal - minVal);
      return paddingTop + plotH - normalized * plotH;
    };

    // Draw horizontal grid lines
    ctx.strokeStyle = "#f1f5f9";
    ctx.lineWidth = 1;
    const gridSteps = 5;
    ctx.fillStyle = "#64748b";
    ctx.font = "10px JetBrains Mono, monospace";
    ctx.textAlign = "right";

    for (let s = 0; s <= gridSteps; s++) {
      const stepVal = minVal + ((maxVal - minVal) * s) / gridSteps;
      const y = paddingTop + plotH - (s / gridSteps) * plotH;

      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();

      ctx.fillText(stepVal.toFixed(1), paddingLeft - 8, y + 3);
    }

    // Draw time labels (start, middle, end)
    ctx.textAlign = "center";
    const timeIndices = [0, Math.floor(points.length / 2), points.length - 1];
    for (const tIdx of timeIndices) {
      const p = points[tIdx];
      const x = getX(tIdx);
      const timeStr = p.timestamp.includes(" ") ? p.timestamp.split(" ")[1].slice(0, 5) : p.timestamp.slice(11, 16);
      ctx.fillText(timeStr, x, height - 10);
    }

    // Draw Signal Path
    ctx.beginPath();
    ctx.lineWidth = 1.8;

    if (mode === "before") {
      ctx.strokeStyle = "#475569"; // Charcoal/Slate for raw noisy signal
    } else {
      ctx.strokeStyle = "#2563eb"; // Royal Blue for clean denoised signal
    }

    let first = true;
    for (let i = 0; i < points.length; i++) {
      const val = mode === "before" ? points[i].original_value : points[i].denoised_value;
      if (val === null || isNaN(val)) continue;

      const x = getX(i);
      const y = getY(val);

      if (first) {
        ctx.moveTo(x, y);
        first = false;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // In BEFORE chart: Highlight Anomaly Points and Markers
    if (mode === "before") {
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        if (p.is_anomaly && p.original_value !== null) {
          const x = getX(i);
          const y = getY(p.original_value);

          // Anomaly marker circle
          ctx.beginPath();
          ctx.arc(x, y, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = "#ef4444"; // Red marker
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
    }

    // Draw active cursor / selected highlight
    const highlightIdx = activeIndex !== null ? activeIndex : selectedIndex;
    if (highlightIdx !== null && highlightIdx >= 0 && highlightIdx < points.length) {
      const p = points[highlightIdx];
      const x = getX(highlightIdx);
      const val = mode === "before" ? p.original_value : p.denoised_value;

      // Vertical cursor line
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1.2;
      ctx.moveTo(x, paddingTop);
      ctx.lineTo(x, paddingTop + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Point circle
      if (val !== null) {
        const y = getY(val);
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = mode === "before" ? "#dc2626" : "#16a34a";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Value tooltip tag above point
        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 11px JetBrains Mono, monospace";
        ctx.textAlign = "center";
        const tagText = `${val.toFixed(2)}`;
        ctx.fillText(tagText, x, Math.max(y - 10, paddingTop + 10));
      }
    }
  };

  // Redraw canvases on updates
  useEffect(() => {
    if (beforeCanvasRef.current) {
      drawChart(beforeCanvasRef.current, "before", hoverIndex);
    }
    if (afterCanvasRef.current) {
      drawChart(afterCanvasRef.current, "after", hoverIndex);
    }
  }, [points, minVal, maxVal, hoverIndex, selectedIndex]);

  // Handle pointer interactions across charts
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const paddingLeft = 45;
    const paddingRight = 15;
    const plotW = canvas.width - paddingLeft - paddingRight;

    const relativeX = (x - paddingLeft) / plotW;
    const index = Math.round(relativeX * (points.length - 1));

    if (index >= 0 && index < points.length) {
      setHoverIndex(index);
    } else {
      setHoverIndex(null);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const paddingLeft = 45;
    const paddingRight = 15;
    const plotW = canvas.width - paddingLeft - paddingRight;

    const relativeX = (x - paddingLeft) / plotW;
    const index = Math.round(relativeX * (points.length - 1));

    if (index >= 0 && index < points.length) {
      onSelectPoint(points[index]);
    }
  };

  // Mobile Touch Support: Allows scrubbing and tapping points on phones
  const handleTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!e.touches || e.touches.length === 0) return;
    const touch = e.touches[0];
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const paddingLeft = 45;
    const paddingRight = 15;
    const plotW = canvas.width - paddingLeft - paddingRight;

    const relativeX = (x - paddingLeft) / plotW;
    const index = Math.round(relativeX * (points.length - 1));

    if (index >= 0 && index < points.length) {
      setHoverIndex(index);
      onSelectPoint(points[index]);
    }
  };

  const handleTouchEnd = () => {
    // Keep the selected index active
  };

  return (
    <div className="card charts-container-card">
      <div className="card-header chart-main-header">
        <div className="chart-header-left">
          <div className="card-title">
            <span>Signal Denoising Inspection</span>
          </div>
          <span className="chart-header-meta">
            Sensor: <strong>{selectedSensorId}</strong> • Feature: <strong style={{ textTransform: "capitalize" }}>{targetFeature}</strong>
          </span>
        </div>
        <div className="chart-header-right">
          Unified Scale: <code className="code-block" style={{ padding: "2px 6px" }}>[{minVal.toFixed(1)}, {maxVal.toFixed(1)}]</code>
        </div>
      </div>

      <div className="charts-grid">
        {/* LEFT: BEFORE DENOISING */}
        <div className="chart-panel">
          <div className="chart-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="chart-badge badge-before">BEFORE DENOISING</span>
              <span style={{ fontSize: 12, color: "#64748b" }}>Raw telemetry with detected anomalies</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#ef4444" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }}></span>
              <span>Anomaly points</span>
            </div>
          </div>
          <div className="chart-canvas-container">
            <canvas
              ref={beforeCanvasRef}
              width={660}
              height={320}
              style={{ width: "100%", height: "100%", cursor: "crosshair", touchAction: "pan-y" }}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoverIndex(null)}
              onClick={handleClick}
              onTouchStart={handleTouch}
              onTouchMove={handleTouch}
              onTouchEnd={handleTouchEnd}
            />
          </div>
        </div>

        {/* RIGHT: AFTER DENOISING */}
        <div className="chart-panel">
          <div className="chart-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="chart-badge badge-after">AFTER DENOISING</span>
              <span style={{ fontSize: 12, color: "#64748b" }}>Cleaned signal via Quantum Hybrid Fusion</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#2563eb" }}>
              <span style={{ width: 14, height: 2, background: "#2563eb" }}></span>
              <span>Denoised output</span>
            </div>
          </div>
          <div className="chart-canvas-container">
            <canvas
              ref={afterCanvasRef}
              width={660}
              height={320}
              style={{ width: "100%", height: "100%", cursor: "crosshair", touchAction: "pan-y" }}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoverIndex(null)}
              onClick={handleClick}
              onTouchStart={handleTouch}
              onTouchMove={handleTouch}
              onTouchEnd={handleTouchEnd}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
