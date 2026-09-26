import React from "react";
import { CpuIcon, PlayIcon, UploadIcon, BarChartIcon, RefreshCwIcon, MenuIcon, QSenseEmblem, UserIcon } from "./Icons";
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
  currentUser?: string | null;
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
  currentUser,
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

          <div
            className="logo-badge"
            onClick={() => onSelectView("all")}
            title="Q-SENSE • Quantum IoT Telemetry Engine"
          >
            <div className="logo-icon-tile">
              <QSenseEmblem size={17} />
            </div>
            <span className="logo-text">
              <span className="logo-text-q">Q</span>
              <span className="logo-text-hyphen">-</span>
              <span className="logo-text-sense">SENSE</span>
            </span>
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
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Right: Actions */}
        <div className="header-actions">
          {activeDatasetName && (
            <div className="dataset-indicator hide-on-mobile" title={`Active: ${activeDatasetName}`}>
              <span className="live-dot"></span>
              <span className="dataset-label">
                {activeDatasetName.split(" ")[0]}
              </span>
            </div>
          )}

          <button
            className="btn-pan-upload hide-on-mobile"
            onClick={onOpenUpload}
            disabled={isLoading}
            title="Upload raw sensor CSV"
          >
            <UploadIcon size={13} />
            <span>Upload CSV</span>
          </button>

          <button
            className="btn btn-primary header-btn-demo"
            onClick={onRunDemo}
            disabled={isLoading}
            title="Execute Official 50-sensor 24h Demo Pipeline (Seed 42)"
          >
            {isLoading ? <RefreshCwIcon size={13} className="spin" /> : <PlayIcon size={13} />}
            <span className="demo-btn-text-desktop hide-on-mobile">{isLoading ? "Processing..." : "Run Demo"}</span>
            <span className="demo-btn-text-mobile show-on-mobile">{isLoading ? "..." : "Demo"}</span>
          </button>

          {hasRun && (
            <button
              className="btn btn-outline hide-on-mobile"
              onClick={onOpenBenchmark}
              title="Open Scientific Benchmark Comparison"
            >
              <BarChartIcon size={13} />
              <span>Benchmark</span>
            </button>
          )}

          <button
            className={`btn-user-pill header-btn-user ${activeView === "login" ? "active" : ""}`}
            onClick={() => onSelectView(activeView === "login" ? "all" : "login")}
            title="Q-SENSE Security Access Portal"
          >
            <UserIcon size={14} />
            <span className="user-pill-text hide-on-mobile">{currentUser || "Login"}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
