import React from "react";
import { CpuIcon, PlayIcon, UploadIcon, BarChartIcon, RefreshCwIcon, MenuIcon } from "./Icons";
import type { DashboardView } from "./Sidebar";

interface HeaderProps {
  isSidebarOpen?: boolean;
  onToggleSidebar: () => void;
  onRunDemo: () => void;
  onOpenUpload: () => void;
  onOpenBenchmark: () => void;
  isLoading: boolean;
  activeDatasetName?: string;
  hasRun: boolean;
  activeView: DashboardView;
  onSelectView: (view: DashboardView) => void;
}

export const Header: React.FC<HeaderProps> = ({
  isSidebarOpen = false,
  onToggleSidebar,
  onRunDemo,
  onOpenUpload,
  onOpenBenchmark,
  isLoading,
  activeDatasetName,
  hasRun,
  activeView,
  onSelectView,
}) => {
  const tabs: Array<{ id: DashboardView; label: string }> = [
    { id: "all", label: "Overview" },
    { id: "simulation", label: "Simulation" },
    { id: "charts", label: "Twin Signals" },
    { id: "spatial", label: "Spatial Map" },
    { id: "anomalies", label: "Anomalies" },
    { id: "quantum", label: "Quantum VQC" },
    { id: "pipeline", label: "Pipeline" },
  ];

  return (
    <header className="app-header">
      <div className="header-inner">
        {/* Left: Sandwich Bar Hamburger Button & Logo */}
        <div className="brand-section">
          <button
            className={`sandwich-toggle-btn ${isSidebarOpen ? "is-active" : ""}`}
            onClick={onToggleSidebar}
            title={isSidebarOpen ? "Close Navigation Menu" : "Toggle Sandwich Navigation Menu"}
            aria-label="Toggle Navigation Menu"
            aria-expanded={isSidebarOpen}
          >
            <div className="hamburger-box">
              <div className="line line1"></div>
              <div className="line line2"></div>
              <div className="line line3"></div>
            </div>
          </button>

          <div className="logo-badge">
            <CpuIcon size={18} />
            <span>Q-SENSE</span>
          </div>
        </div>

        {/* View Switcher Tabs (Desktop & Tablet) */}
        <div className="header-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`header-tab-btn ${activeView === tab.id ? "active" : ""}`}
              onClick={() => onSelectView(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right: Actions */}
        <div className="header-actions">
          {activeDatasetName && (
            <div className="dataset-indicator" title={`Active: ${activeDatasetName}`}>
              <span className="live-dot"></span>
              <span className="dataset-label">
                {activeDatasetName.length > 24 ? activeDatasetName.slice(0, 22) + "..." : activeDatasetName}
              </span>
            </div>
          )}

          <button
            className="btn-pan-upload"
            onClick={onOpenUpload}
            disabled={isLoading}
            title="Upload raw sensor CSV"
          >
            <UploadIcon size={14} />
            <span>Upload CSV</span>
          </button>

          <button
            className="btn btn-primary"
            onClick={onRunDemo}
            disabled={isLoading}
            title="Execute Official 50-sensor 24h Demo Pipeline (Seed 42)"
          >
            {isLoading ? <RefreshCwIcon size={14} className="spin" /> : <PlayIcon size={14} />}
            <span>{isLoading ? "Processing..." : "Run Official Demo"}</span>
          </button>

          {hasRun && (
            <button
              className="btn btn-outline"
              onClick={onOpenBenchmark}
              title="Open Scientific Benchmark Comparison"
            >
              <BarChartIcon size={14} />
              <span>Benchmark</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
