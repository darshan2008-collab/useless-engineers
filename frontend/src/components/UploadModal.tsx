import React, { useState } from "react";
import { UploadIcon } from "./Icons";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => void;
  isLoading: boolean;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  isLoading,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFile) {
      onUpload(selectedFile);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <UploadIcon size={20} className="text-blue" />
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Upload Sensor Telemetry CSV</h2>
          </div>
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
              Select CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid #cbd5e1",
                borderRadius: 6,
                fontSize: 13,
              }}
            />
            <p style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>
              Requires columns: <code>sensor_id</code>, <code>timestamp</code>, <code>latitude</code>, <code>longitude</code>, and at least one numeric sensor feature.
            </p>
          </div>

          <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>
              Non-destructive Ingestion Protocol:
            </div>
            <ul style={{ fontSize: 11, color: "#64748b", paddingLeft: 18, lineHeight: 1.5 }}>
              <li>Coordinates validated against Earth limits (-90/90, -180/180)</li>
              <li>Missing values recorded with original provenance</li>
              <li>Units preserved in output; robust scaling applied only during VQC processing</li>
            </ul>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-pan-upload"
              disabled={!selectedFile || isLoading}
            >
              <UploadIcon size={14} />
              <span>{isLoading ? "Validating & Ingesting..." : "Upload & Process"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
