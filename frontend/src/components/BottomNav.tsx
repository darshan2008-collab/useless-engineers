import React from "react";
import {
  HomeIcon,
  ActivityIcon,
  SlidersIcon,
  MapPinIcon,
  MenuIcon,
  AlertTriangleIcon
} from "./Icons";
import type { DashboardView } from "./Sidebar";

interface BottomNavProps {
  activeView: DashboardView;
  onSelectView: (view: DashboardView) => void;
  onOpenMenu: () => void;
  anomalyCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeView,
  onSelectView,
  onOpenMenu,
  anomalyCount = 0,
}) => {
  const navTabs = [
    {
      id: "all" as DashboardView,
      label: "Overview",
      icon: <HomeIcon size={20} />,
    },
    {
      id: "charts" as DashboardView,
      label: "Twin Signals",
      icon: <ActivityIcon size={20} />,
    },
    {
      id: "simulation" as DashboardView,
      label: "Simulation",
      icon: <SlidersIcon size={20} />,
    },
    {
      id: "spatial" as DashboardView,
      label: "Sensors",
      icon: <MapPinIcon size={20} />,
    },
  ];

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      <div className="mobile-bottom-nav-inner">
        {navTabs.map((tab) => {
          const isActive = activeView === tab.id;
          return (
            <button
              key={tab.id}
              className={`mobile-nav-btn ${isActive ? "active" : ""}`}
              onClick={() => onSelectView(tab.id)}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="nav-icon-wrapper">
                {tab.icon}
                {tab.id === "all" && anomalyCount > 0 && (
                  <span className="mobile-nav-dot" title={`${anomalyCount} anomalies`} />
                )}
              </div>
              <span className="mobile-nav-label">{tab.label}</span>
              {isActive && <span className="mobile-nav-active-pill" />}
            </button>
          );
        })}

        {/* 5th Button: Sandwich / Drawer Menu for secondary views & APK options */}
        <button
          className={`mobile-nav-btn ${activeView === "anomalies" || activeView === "quantum" || activeView === "pipeline" || activeView === "login" ? "active-secondary" : ""}`}
          onClick={onOpenMenu}
          aria-label="Open More Menu"
        >
          <div className="nav-icon-wrapper">
            <MenuIcon size={20} />
            {anomalyCount > 0 && (
              <span className="mobile-nav-badge">{anomalyCount > 99 ? "99+" : anomalyCount}</span>
            )}
          </div>
          <span className="mobile-nav-label">More</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
