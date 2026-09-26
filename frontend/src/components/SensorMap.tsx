import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import type { SensorMetadata } from "../types";
import { MapPinIcon, AlertTriangleIcon } from "./Icons";

// Professional SVG vector icons to replace raw emojis
const StreetMapIcon = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </svg>
);

const SatelliteIcon = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M13 7 9 3 5 7l4 4" />
    <path d="m17 11 4 4-4 4-4-4" />
    <path d="m8 12 4 4 6-6-4-4Z" />
    <path d="m16 8 3-3" />
    <path d="M9 21a6 6 0 0 0-6-6" />
  </svg>
);

const MoonDarkIcon = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

const MeshGridIcon = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M3 9h18" />
    <path d="M3 15h18" />
    <path d="M9 3v18" />
    <path d="M15 3v18" />
  </svg>
);

const CrosshairTargetIcon = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10" />
    <line x1="22" y1="12" x2="18" y2="12" />
    <line x1="6" y1="12" x2="2" y2="12" />
    <line x1="12" y1="6" x2="12" y2="2" />
    <line x1="12" y1="22" x2="12" y2="18" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const InfoCircleIcon = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

interface SensorMapProps {
  sensors: SensorMetadata[];
  selectedSensorId: string;
  onSelectSensor: (sensorId: string) => void;
}

type MapTileStyle = "voyager" | "satellite" | "dark" | "schematic";

export const SensorMap: React.FC<SensorMapProps> = ({
  sensors,
  selectedSensorId,
  onSelectSensor,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});

  const [mapStyle, setMapStyle] = useState<MapTileStyle>("voyager");
  const [tileError, setTileError] = useState(false);

  // Compute stats
  const totalSensors = sensors?.length || 0;
  const anomalyCount = sensors?.filter((s) => s.status === "anomaly").length || 0;
  const warningCount = sensors?.filter((s) => s.status === "warning").length || 0;
  const normalCount = sensors?.filter((s) => s.status === "normal").length || 0;

  // Tile layer URLs (Free, open raster tiles with zero API key restrictions or watermarks)
  const getTileConfig = (style: MapTileStyle) => {
    switch (style) {
      case "satellite":
        return {
          url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          attribution: '&copy; <a href="https://www.esri.com/">Esri</a>, Earthstar Geographics',
          maxZoom: 19,
          className: "",
        };
      case "dark":
        return {
          url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
          className: "osm-dark-tiles",
        };
      case "voyager":
      default:
        return {
          url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
          className: "",
        };
    }
  };

  // Helper to create custom HTML markers
  const createMarkerIcon = (s: SensorMetadata, isSelected: boolean) => {
    let color = "#10b981"; // green
    let glow = "rgba(16, 185, 129, 0.4)";
    let badgeClass = "badge-normal";

    if (s.status === "anomaly") {
      color = "#ef4444"; // red
      glow = "rgba(239, 68, 68, 0.5)";
      badgeClass = "badge-anomaly";
    } else if (s.status === "warning") {
      color = "#f59e0b"; // amber
      glow = "rgba(245, 158, 11, 0.4)";
      badgeClass = "badge-warning";
    }

    const ringStyle = isSelected
      ? `box-shadow: 0 0 0 3px #ffffff, 0 0 0 6px #2563eb, 0 4px 14px rgba(37,99,235,0.6); transform: scale(1.25);`
      : `box-shadow: 0 0 0 2px #ffffff, 0 2px 8px ${glow};`;

    const pulseAnimation = s.status === "anomaly"
      ? `<span style="position: absolute; top: -4px; left: 8px; width: 22px; height: 22px; border-radius: 50%; background: rgba(239, 68, 68, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>`
      : "";

    return L.divIcon({
      className: "custom-sensor-div-icon",
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; user-select: none;">
          ${pulseAnimation}
          <div style="background: ${color}; width: 14px; height: 14px; border-radius: 50%; ${ringStyle} transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); z-index: 2;"></div>
          <div style="background: rgba(15, 23, 42, 0.88); backdrop-filter: blur(4px); color: #ffffff; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; font-family: var(--font-mono, monospace); margin-top: 3px; white-space: nowrap; border: 1px solid rgba(255,255,255,0.25); box-shadow: 0 2px 6px rgba(0,0,0,0.3); z-index: 1;">
            ${s.sensor_id}
          </div>
        </div>
      `,
      iconSize: [46, 40],
      iconAnchor: [23, 7],
      popupAnchor: [0, -12],
    });
  };

  // Initialize Map
  useEffect(() => {
    if (mapStyle === "schematic" || !mapContainerRef.current || !sensors || sensors.length === 0) {
      return;
    }

    if (!mapInstanceRef.current) {
      // Calculate center
      const avgLat = sensors.reduce((acc, s) => acc + s.latitude, 0) / sensors.length;
      const avgLon = sensors.reduce((acc, s) => acc + s.longitude, 0) / sensors.length;

      const map = L.map(mapContainerRef.current, {
        center: [avgLat, avgLon],
        zoom: 13,
        zoomControl: false,
        attributionControl: true,
      });

      L.control.zoom({ position: "topright" }).addTo(map);

      // Add Tile Layer
      const config = getTileConfig(mapStyle);
      const tiles = L.tileLayer(config.url, {
        attribution: config.attribution,
        maxZoom: config.maxZoom,
        className: config.className,
      });

      tiles.on("tileerror", () => {
        setTileError(true);
      });

      tiles.addTo(map);
      tileLayerRef.current = tiles;
      mapInstanceRef.current = map;

      // Fit bounds to show all stations
      const bounds = L.latLngBounds(sensors.map((s) => [s.latitude, s.longitude]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        tileLayerRef.current = null;
        markersRef.current = {};
      }
    };
  }, [mapStyle]);

  // Update Tile Layer if mapStyle changes
  useEffect(() => {
    if (!mapInstanceRef.current || mapStyle === "schematic") return;

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    const config = getTileConfig(mapStyle);
    const tiles = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: config.maxZoom,
      className: config.className,
    });

    tiles.on("tileerror", () => {
      setTileError(true);
    });

    tiles.addTo(mapInstanceRef.current);
    tileLayerRef.current = tiles;
  }, [mapStyle]);

  // Update Markers
  useEffect(() => {
    if (!mapInstanceRef.current || mapStyle === "schematic" || !sensors) return;

    const map = mapInstanceRef.current;

    // Remove old markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    sensors.forEach((s) => {
      const isSelected = s.sensor_id === selectedSensorId;
      const icon = createMarkerIcon(s, isSelected);

      const marker = L.marker([s.latitude, s.longitude], {
        icon,
        zIndexOffset: isSelected ? 1000 : 0,
      });

      const statusBg =
        s.status === "anomaly" ? "#fee2e2" : s.status === "warning" ? "#fef3c7" : "#d1fae5";
      const statusColor =
        s.status === "anomaly" ? "#b91c1c" : s.status === "warning" ? "#b45309" : "#047857";

      const popupContent = `
        <div style="font-family: inherit; min-width: 190px; padding: 4px 2px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
            <div style="font-weight: 800; font-size: 15px; color: #0f172a; font-family: monospace;">${s.sensor_id}</div>
            <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 2px 7px; border-radius: 9999px; background: ${statusBg}; color: ${statusColor};">
              ${s.status}
            </span>
          </div>
          <div style="font-size: 12px; color: #475569; display: flex; flex-direction: column; gap: 4px;">
            <div><strong>Location:</strong> ${s.latitude.toFixed(5)}, ${s.longitude.toFixed(5)}</div>
            <div><strong>Anomalies:</strong> ${s.anomaly_count || 0}</div>
            <div><strong>Denoised Mean:</strong> ${s.mean_denoised != null ? s.mean_denoised.toFixed(2) : "N/A"}</div>
            <div><strong>Quantum Fusion (α):</strong> ${(s.avg_fusion_weight != null ? s.avg_fusion_weight * 100 : 0).toFixed(1)}%</div>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { closeButton: false });

      marker.on("click", () => {
        onSelectSensor(s.sensor_id);
      });

      marker.addTo(map);
      markersRef.current[s.sensor_id] = marker;
    });
  }, [sensors, selectedSensorId, mapStyle, onSelectSensor]);

  // Recenter helper
  const handleRecenter = () => {
    if (mapInstanceRef.current && sensors && sensors.length > 0) {
      const bounds = L.latLngBounds(sensors.map((s) => [s.latitude, s.longitude]));
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }
  };

  // Focus selected sensor
  useEffect(() => {
    if (mapInstanceRef.current && selectedSensorId && markersRef.current[selectedSensorId]) {
      const marker = markersRef.current[selectedSensorId];
      const latLng = marker.getLatLng();
      mapInstanceRef.current.panTo(latLng, { animate: true, duration: 0.5 });
      marker.openPopup();
    }
  }, [selectedSensorId]);

  if (!sensors || sensors.length === 0) {
    return (
      <div className="card" style={{ padding: 24, textAlign: "center", color: "#64748b" }}>
        No sensor network data available. Please generate or upload a dataset.
      </div>
    );
  }

  // Fallback schematic projection calculation
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

  const width = 640;
  const height = 380;
  const getSvgX = (lon: number) => ((lon - bMinLon) / (bMaxLon - bMinLon)) * (width - 40) + 20;
  const getSvgY = (lat: number) => height - (((lat - bMinLat) / (bMaxLat - bMinLat)) * (height - 40) + 20);

  return (
    <div className="card" style={{ padding: 18, position: "relative", overflow: "hidden" }}>
      {/* Header with Title and Mode Controls */}
      <div
        className="card-header map-card-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(37, 99, 235, 0.1)",
              color: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MapPinIcon size={18} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
              Spatial Sensor Network Map
            </div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              Geographic coordinates & cluster anomaly distribution ({totalSensors} stations)
            </div>
          </div>
        </div>

        {/* View Style Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <div
            style={{
              background: "#f1f5f9",
              padding: 3,
              borderRadius: 8,
              display: "flex",
              gap: 2,
              border: "1px solid #e2e8f0",
            }}
          >
            <button
              onClick={() => setMapStyle("voyager")}
              style={{
                border: "none",
                background: mapStyle === "voyager" ? "#ffffff" : "transparent",
                color: mapStyle === "voyager" ? "#2563eb" : "#64748b",
                fontWeight: mapStyle === "voyager" ? 700 : 500,
                boxShadow: mapStyle === "voyager" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                borderRadius: 6,
                padding: "5px 11px",
                fontSize: 12,
                cursor: "pointer",
                transition: "all 0.2s",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <StreetMapIcon size={13} />
              <span>Street</span>
            </button>
            <button
              onClick={() => setMapStyle("satellite")}
              style={{
                border: "none",
                background: mapStyle === "satellite" ? "#ffffff" : "transparent",
                color: mapStyle === "satellite" ? "#2563eb" : "#64748b",
                fontWeight: mapStyle === "satellite" ? 700 : 500,
                boxShadow: mapStyle === "satellite" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                borderRadius: 6,
                padding: "5px 11px",
                fontSize: 12,
                cursor: "pointer",
                transition: "all 0.2s",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <SatelliteIcon size={13} />
              <span>Satellite</span>
            </button>
            <button
              onClick={() => setMapStyle("dark")}
              style={{
                border: "none",
                background: mapStyle === "dark" ? "#ffffff" : "transparent",
                color: mapStyle === "dark" ? "#2563eb" : "#64748b",
                fontWeight: mapStyle === "dark" ? 700 : 500,
                boxShadow: mapStyle === "dark" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                borderRadius: 6,
                padding: "5px 11px",
                fontSize: 12,
                cursor: "pointer",
                transition: "all 0.2s",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <MoonDarkIcon size={13} />
              <span>Dark</span>
            </button>
            <button
              onClick={() => setMapStyle("schematic")}
              style={{
                border: "none",
                background: mapStyle === "schematic" ? "#ffffff" : "transparent",
                color: mapStyle === "schematic" ? "#2563eb" : "#64748b",
                fontWeight: mapStyle === "schematic" ? 700 : 500,
                boxShadow: mapStyle === "schematic" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                borderRadius: 6,
                padding: "5px 11px",
                fontSize: 12,
                cursor: "pointer",
                transition: "all 0.2s",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <MeshGridIcon size={13} />
              <span>Grid</span>
            </button>
          </div>

          {mapStyle !== "schematic" && (
            <button
              onClick={handleRecenter}
              title="Fit all sensors in view"
              style={{
                border: "1px solid #e2e8f0",
                background: "#ffffff",
                color: "#334155",
                borderRadius: 8,
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                transition: "all 0.2s",
              }}
            >
              <CrosshairTargetIcon size={13} />
              <span>Recenter</span>
            </button>
          )}
        </div>
      </div>

      {/* Sensor Status Legend & Quick Stats */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          background: "#f8fafc",
          padding: "8px 14px",
          borderRadius: 8,
          marginBottom: 12,
          border: "1px solid #e2e8f0",
          fontSize: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981", display: "inline-block" }}></span>
            <span>Normal (<strong>{normalCount}</strong>)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", display: "inline-block" }}></span>
            <span>Warning (<strong>{warningCount}</strong>)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", display: "inline-block" }}></span>
            <span>Anomaly (<strong>{anomalyCount}</strong>)</span>
          </div>
        </div>

        <div style={{ color: "#64748b", fontSize: 11 }}>
          Selected: <strong style={{ color: "#2563eb", fontFamily: "monospace" }}>{selectedSensorId || "None"}</strong>
        </div>
      </div>

      {/* Main Map Viewport */}
      {mapStyle !== "schematic" ? (
        <div
          style={{
            position: "relative",
            width: "100%",
            height: 480,
            borderRadius: 10,
            overflow: "hidden",
            border: "1px solid #e2e8f0",
            boxShadow: "inset 0 1px 4px rgba(0,0,0,0.08)",
          }}
        >
          <div
            ref={mapContainerRef}
            style={{
              width: "100%",
              height: "100%",
              zIndex: 1,
            }}
          />

          {tileError && (
            <div
              style={{
                position: "absolute",
                top: 10,
                left: 10,
                zIndex: 1000,
                background: "rgba(254, 242, 242, 0.95)",
                border: "1px solid #f87171",
                color: "#991b1b",
                padding: "6px 12px",
                borderRadius: 6,
                fontSize: 11,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <AlertTriangleIcon size={14} />
              <span>Online map tiles unreachable. You can switch to <strong>Grid</strong> view above.</span>
            </div>
          )}
        </div>
      ) : (
        /* Schematic Grid Projection */
        <div
          style={{
            background: "#0f172a",
            borderRadius: 10,
            border: "1px solid #334155",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", display: "block" }}>
            {/* Coordinate Grid lines */}
            <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#334155" strokeDasharray="4 4" />
            <line x1={width / 2} y1="0" x2={width / 2} y2={height} stroke="#334155" strokeDasharray="4 4" />

            {/* Mesh connectors between neighboring sensors */}
            {sensors.slice(0, 30).map((s, idx) => {
              const next = sensors[(idx + 1) % sensors.length];
              const x1 = getSvgX(s.longitude);
              const y1 = getSvgY(s.latitude);
              const x2 = getSvgX(next.longitude);
              const y2 = getSvgY(next.latitude);
              return (
                <line
                  key={`line-${idx}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(56, 189, 248, 0.15)"
                  strokeWidth={1}
                />
              );
            })}

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
                  <circle cx={cx} cy={cy} r={18} fill="transparent" />
                  {isSelected && (
                    <circle cx={cx} cy={cy} r={14} fill="none" stroke="#38bdf8" strokeWidth={2.5} strokeDasharray="3 3" />
                  )}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isSelected ? 8 : 6}
                    fill={fillColor}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                  />
                  <text
                    x={cx}
                    y={cy - 10}
                    fontSize={10}
                    fontFamily="var(--font-mono, monospace)"
                    fill={isSelected ? "#38bdf8" : "#94a3b8"}
                    fontWeight={isSelected ? "800" : "600"}
                    textAnchor="middle"
                  >
                    {s.sensor_id}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* Bottom Hint */}
      <div
        style={{
          marginTop: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 11,
          color: "#64748b",
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <InfoCircleIcon size={13} />
          <span>Click any station marker to select it and view live telemetry twin charts.</span>
        </div>
        <span>Drag to pan • Scroll to zoom</span>
      </div>
    </div>
  );
};
