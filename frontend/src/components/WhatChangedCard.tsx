import React from "react";
import { CheckCircleIcon, InfoIcon } from "./Icons";

interface WhatChangedCardProps {
  statements: string[];
}

export const WhatChangedCard: React.FC<WhatChangedCardProps> = ({ statements }) => {
  if (!statements || statements.length === 0) return null;

  return (
    <div
      className="card"
      style={{
        background: "rgba(255, 255, 255, 0.92)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1px solid rgba(226, 232, 240, 0.85)",
        borderLeft: "4px solid #2563eb",
        marginBottom: 28,
        padding: "20px 24px",
      }}
    >
      <div className="card-header" style={{ marginBottom: 14 }}>
        <div className="card-title" style={{ fontSize: 14, color: "#0f172a", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: "#eff6ff", color: "#2563eb", padding: "6px", borderRadius: "50%", display: "flex" }}>
            <InfoIcon size={16} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: "-0.2px" }}>
              What Changed?
            </div>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 500, textTransform: "none" }}>
              Key processing findings
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
        {statements.map((stmt, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              background: "rgba(248, 250, 252, 0.85)",
              border: "1px solid rgba(226, 232, 240, 0.85)",
              borderRadius: 8,
              fontSize: 13,
              color: "#1e293b",
              lineHeight: 1.4,
            }}
          >
            <span style={{ color: "#10b981", flexShrink: 0, display: "flex" }}>
              <CheckCircleIcon size={16} />
            </span>
            <span>{stmt}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
