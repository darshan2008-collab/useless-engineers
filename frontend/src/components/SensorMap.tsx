import React from "react";
import type { SensorMetadata } from "../types";
import { MapPinIcon } from "./Icons";

interface SensorMapProps {
  sensors: SensorMetadata[];
  selectedSensorId: string;
  onSelectSensor: (sensorId: string) => void;
}

export const SensorMap: React.FC<SensorMapProps> = ({
  sensors,
  selectedSensorId,
  onSelectSensor,
}) => {
  if (!sensors || sensors.length === 0) return null;

  // Compute bounding box for projection
  let minLat = Infinity, maxLat = -Infinity;
  let minLon = Infinity, maxLon = -Infinity;

  for (const s of sensors) {
    if (s.latitude < minLat) minLat = s.latitude;
    if (s.latitude > maxLat) maxLat = s.latitude;
    if (s.longitude < minLon) minLon = s.longitude;
    if (s.longitude > maxLon) maxLon = s.longitude;
  }

  const padLat = (maxLat - minLat) * 0.1 || 0.005;
  const padLon = (maxLon - minLon) * 0.1 || 0.005;

  const bMinLat = minLat - padLat;
  const bMaxLat = maxLat + padLat;
  const bMinLon = minLon - padLon;
  const bMaxLon = maxLon + padLon;

  const width = 600;
  const height = 300;

  const getSvgX = (lon: number) => ((lon - bMinLon) / (bMaxLon - bMinLon)) * (width - 40) + 20;
  const getSvgY = (lat: number) => height - (((lat - bMinLat) / (bMaxLat - bMinLat)) * (height - 40) + 20);

  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="card-header" style={{ marginBottom: 10 }}>
        <div className="card-title">
          <MapPinIcon size={16} />
          <span>Spatial Sensor Network Map (50 IoT Stations)</span>
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 11 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }}></span>
            <span>Normal</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }}></span>
            <span>Warning (&gt;0 anom)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }}></span>
            <span>High Anomaly (&gt;15 anom)</span>
          </div>
        </div>
      </div>

      <div style={{ background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", overflow: "hidden", position: "relative" }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", display: "block" }}>
          {/* Subtle grid lines */}
          <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#e2e8f0" strokeDasharray="4 4" />
          <line x1={width / 2} y1="0" x2={width / 2} y2={height} stroke="#e2e8f0" strokeDasharray="4 4" />

          {/* Sensors */}
          {sensors.map((s) => {
            const cx = getSvgX(s.longitude);
            const cy = getSvgY(s.latitude);
            const isSelected = s.sensor_id === selectedSensorId;

            let fillColor = "#10b981";
            if (s.status === "anomaly") fillColor = "#ef4444";
            else if (s.status === "warning") fillColor = "#f59e0b";

            return (
              <g
                key={s.sensor_id}
                onClick={() => onSelectSensor(s.sensor_id)}
                style={{ cursor: "pointer" }}
              >
                {isSelected && (
                  <circle cx={cx} cy={cy} r={12} fill="none" stroke="#2563eb" strokeWidth={2.5} strokeDasharray="3 3" />
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isSelected ? 7 : 5}
                  fill={fillColor}
                  stroke="#ffffff"
                  strokeWidth={1.5}
                />
                <text
                  x={cx}
                  y={cy - 9}
                  fontSize={9}
                  fontFamily="var(--font-mono)"
                  fill={isSelected ? "#2563eb" : "#475569"}
                  fontWeight={isSelected ? "700" : "500"}
                  textAnchor="middle"
                >
                  {s.sensor_id}
                </text>
              </g>
            );
          })}
        </svg>

        <div style={{ position: "absolute", bottom: 8, right: 12, fontSize: 10, color: "#64748b" }}>
          Click any sensor node to inspect its twin before/after telemetry
        </div>
      </div>
    </div>
  );
};
