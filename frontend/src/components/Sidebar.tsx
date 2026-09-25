import React from "react";
import {
  XIcon,
  HomeIcon,
  ActivityIcon,
  MapPinIcon,
  AlertTriangleIcon,
  CpuIcon,
  LayersIcon,
  BarChartIcon,
  PlayIcon,
  UploadIcon,
  DownloadIcon,
  CheckCircleIcon,
  SlidersIcon
} from "./Icons";

export type DashboardView =
  | "all"
  | "simulation"
  | "charts"
  | "spatial"
  | "anomalies"
  | "quantum"
  | "pipeline";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeView: DashboardView;
  onSelectView: (view: DashboardView) => void;
  onRunDemo: () => void;
  onOpenUpload: () => void;
  onOpenBenchmark: () => void;
  isLoading: boolean;
  hasRun: boolean;
  runId: string | null;
  datasetName: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  activeView,
  onSelectView,
  onRunDemo,
  onOpenUpload,
  onOpenBenchmark,
  isLoading,
  hasRun,
  runId,
  datasetName,
}) => {
  const menuItems: Array<{ id: DashboardView; label: string; desc: string; icon: React.ReactNode }> = [
    {
      id: "all",
      label: "Overview",
      desc: "Telemetry & summary",
      icon: <HomeIcon size={18} />,
    },
    {
      id: "simulation",
      label: "Simulation Studio",
      desc: "Synthetic data generator",
      icon: <SlidersIcon size={18} />,
    },
    {
      id: "charts",
      label: "Twin Signal Denoising",
      desc: "Dual signal comparison",
      icon: <ActivityIcon size={18} />,
    },
    {
      id: "spatial",
      label: "Spatial Sensor Network",
      desc: "50-station sensor mesh",
      icon: <MapPinIcon size={18} />,
    },
    {
      id: "anomalies",
      label: "Anomaly Provenance Log",
      desc: "Flagged anomaly records",
      icon: <AlertTriangleIcon size={18} />,
    },
    {
      id: "quantum",
      label: "Quantum VQC Engine",
      desc: "4-Qubit quantum circuit",
      icon: <CpuIcon size={18} />,
    },
    {
      id: "pipeline",
      label: "Processing Architecture",
      desc: "10-stage processing pipeline",
      icon: <LayersIcon size={18} />,
    },
  ];

  return (
    <>
      {/* Backdrop overlay for mobile & desktop drawer */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sandwich Bar Drawer */}
      <aside className={`sidebar-drawer ${isOpen ? "open" : ""}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand-lockup">
            <div className="sidebar-logo-icon">
              <CpuIcon size={18} />
            </div>
            <div>
              <div className="sidebar-title">Q-SENSE ENGINE</div>
              <div className="sidebar-subtitle">Urban IoT Denoising</div>
            </div>
          </div>

          <button
            className="sidebar-close-btn"
            onClick={onClose}
            title="Close drawer"
            aria-label="Close drawer"
          >
            <XIcon size={15} />
          </button>
        </div>

        {/* Menu Navigation Items */}
        <div className="sidebar-nav">
          <div className="sidebar-nav-header">
            Dashboard Views
          </div>
          {menuItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                className={`sidebar-nav-item ${isActive ? "active" : ""}`}
                onClick={() => {
                  onSelectView(item.id);
                  onClose();
                }}
              >
                <div className={`nav-icon-box ${isActive ? "active" : ""}`}>
                  {item.icon}
                </div>
                <div className="nav-text-group">
                  <div className="nav-label">{item.label}</div>
                  <div className="nav-desc">{item.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Action Shortcuts Section */}
        <div className="sidebar-footer">
          <div className="sidebar-footer-title">
            Engine Operations
          </div>

          <button
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", marginBottom: 8, height: 38 }}
            onClick={() => {
              onRunDemo();
              onClose();
            }}
            disabled={isLoading}
          >
            <PlayIcon size={14} />
            <span>{isLoading ? "Running..." : "Run Official Demo"}</span>
          </button>

          <button
            className="btn btn-outline"
            style={{ width: "100%", justifyContent: "center", marginBottom: 8, height: 38 }}
            onClick={() => {
              onOpenUpload();
              onClose();
            }}
            disabled={isLoading}
          >
            <UploadIcon size={14} />
            <span>Upload CSV</span>
          </button>

          {hasRun && (
            <button
              className="btn btn-outline"
              style={{ width: "100%", justifyContent: "center", height: 38 }}
              onClick={() => {
                onOpenBenchmark();
                onClose();
              }}
            >
              <BarChartIcon size={14} />
              <span>Benchmark</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
