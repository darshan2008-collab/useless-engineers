import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import type { DashboardView } from "./components/Sidebar";
import { MetricsSummary } from "./components/MetricsSummary";
import { WhatChangedCard } from "./components/WhatChangedCard";
import { SynchronizedCharts } from "./components/SynchronizedCharts";
import { AnomalyInspector } from "./components/AnomalyInspector";
import { SensorMap } from "./components/SensorMap";
import { AnomalyTable } from "./components/AnomalyTable";
import { QuantumDrawer } from "./components/QuantumDrawer";
import { PipelineVisualizer } from "./components/PipelineVisualizer";
import { BenchmarkModal } from "./components/BenchmarkModal";
import { UploadModal } from "./components/UploadModal";
import { SimulationStudio } from "./components/SimulationStudio";
import { LoginPage } from "./components/LoginPage";
import { BottomNav } from "./components/BottomNav";
import {
  DownloadIcon,
  BarChartIcon,
  ActivityIcon,
  MapPinIcon,
  AlertTriangleIcon,
  CpuIcon,
  LayersIcon,
  SlidersIcon,
  ChevronRightIcon
} from "./components/Icons";

import {
  generateDemoSimulation,
  startProcessingRun,
  getRunSummary,
  getRunResults,
  getRunAnomalies,
  getSensorNetwork,
  getBenchmarkResults,
  uploadDataset,
  getDownloadDenoisedUrl,
  getDownloadAnomaliesUrl,
} from "./api";

import type { RunSummary, TimeSeriesPoint, AnomalyItem, SensorMetadata, BenchmarkData } from "./types";

export const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<DashboardView>("all");
  const [currentUser, setCurrentUser] = useState<string | null>("telemetry_engineer");

  const [runId, setRunId] = useState<string | null>(null);
  const [datasetName, setDatasetName] = useState<string>("noisy_sensor_data.csv (50 Sensors, Seed 42)");
  const [selectedSensorId, setSelectedSensorId] = useState<string>("S001");
  const [targetFeature, setTargetFeature] = useState<string>("temperature");

  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [seriesPoints, setSeriesPoints] = useState<TimeSeriesPoint[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [sensorNetwork, setSensorNetwork] = useState<SensorMetadata[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<TimeSeriesPoint | null>(null);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isBenchmarkOpen, setIsBenchmarkOpen] = useState<boolean>(false);
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkData | null>(null);

  // Execute official 50-sensor demo scenario (Section 71)
  const handleRunOfficialDemo = async () => {
    setIsLoading(true);
    try {
      const simRes = await generateDemoSimulation();
      const datasetId = simRes.data?.dataset_id || "demo-50-sensors";
      setDatasetName("noisy_sensor_data.csv (50 Sensors, Seed 42)");

      const runRes = await startProcessingRun(datasetId, targetFeature);
      const newRunId = runRes.data?.run_id || "demo-run-42";
      setRunId(newRunId);
      await loadRunData(newRunId, selectedSensorId, targetFeature);
    } catch (e: any) {
      console.warn("Recovering with official demo dataset:", e);
      try {
        await loadRunData("demo-run-42", selectedSensorId, targetFeature);
      } catch (err) {
        console.error("Demo load error:", err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Run denoising pipeline on a specific dataset ID (e.g. from SimulationStudio)
  const handleRunPipelineOnDataset = async (targetDatasetId: string) => {
    setIsLoading(true);
    try {
      const runRes = await startProcessingRun(targetDatasetId, targetFeature);
      if (!runRes.success) {
        alert("Processing run failed: " + JSON.stringify(runRes.errors));
        setIsLoading(false);
        return;
      }

      const newRunId = runRes.data.run_id;
      setRunId(newRunId);
      await loadRunData(newRunId, selectedSensorId, targetFeature);
      setActiveView("all");
    } catch (e: any) {
      alert("Error executing pipeline on generated dataset: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Load telemetry and metrics for an active run
  const loadRunData = async (currentRunId: string, sensorId: string, feature: string) => {
    try {
      const [sumRes, resRes, anomRes, sensorRes, benchRes] = await Promise.all([
        getRunSummary(currentRunId),
        getRunResults(currentRunId, sensorId, feature),
        getRunAnomalies(currentRunId),
        getSensorNetwork(currentRunId),
        getBenchmarkResults(currentRunId),
      ]);

      if (sumRes.success) setSummary(sumRes.data);
      if (resRes.success) {
        setSeriesPoints(resRes.data.series);
        if (resRes.data.series.length > 0) {
          const firstAnom = resRes.data.series.find((p) => p.is_anomaly);
          if (firstAnom) setSelectedPoint(firstAnom);
        }
      }
      if (anomRes.success) setAnomalies(anomRes.data);
      if (sensorRes.success) setSensorNetwork(sensorRes.data);
      if (benchRes.success) setBenchmarkData(benchRes.data);
    } catch (err) {
      console.error("Error loading run data:", err);
    }
  };

  // Switch sensor
  const handleSelectSensor = async (sId: string) => {
    setSelectedSensorId(sId);
    if (runId) {
      const res = await getRunResults(runId, sId, targetFeature);
      if (res.success) {
        setSeriesPoints(res.data.series);
        const anom = res.data.series.find((p) => p.is_anomaly);
        setSelectedPoint(anom || res.data.series[0] || null);
      }
    }
  };

  // Select anomaly row
  const handleSelectAnomaly = (item: AnomalyItem) => {
    if (item.sensor_id !== selectedSensorId) {
      handleSelectSensor(item.sensor_id);
    }
    const matchingPoint = seriesPoints.find((p) => p.timestamp === item.timestamp);
    if (matchingPoint) {
      setSelectedPoint(matchingPoint);
    } else {
      setSelectedPoint({
        timestamp: item.timestamp,
        sensor_id: item.sensor_id,
        original_value: item.original_value,
        denoised_value: item.final_value,
        classical_value: item.classical_value,
        quantum_correction: item.quantum_correction,
        fusion_weight: item.fusion_weight,
        anomaly_score: item.anomaly_score,
        anomaly_type: item.anomaly_type,
        is_anomaly: true,
        fallback_used: item.fallback_used,
      });
    }
  };

  // Handle custom file upload
  const handleCustomUpload = async (file: File) => {
    setIsLoading(true);
    setIsUploadOpen(false);
    try {
      const upRes = await uploadDataset(file);
      if (!upRes.success) {
        alert("Upload error: " + JSON.stringify(upRes.errors));
        setIsLoading(false);
        return;
      }

      setDatasetName(file.name);
      const datasetId = upRes.data.dataset_id;

      const runRes = await startProcessingRun(datasetId, targetFeature);
      if (!runRes.success) {
        alert("Processing run failed: " + JSON.stringify(runRes.errors));
        setIsLoading(false);
        return;
      }

      const newRunId = runRes.data.run_id;
      setRunId(newRunId);
      await loadRunData(newRunId, selectedSensorId, targetFeature);
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto trigger official demo on initial load
  useEffect(() => {
    handleRunOfficialDemo();
  }, []);

  if (activeView === "login") {
    return (
      <LoginPage
        onLoginSuccess={(uname) => {
          setCurrentUser(uname);
          setActiveView("all");
        }}
        onCancel={() => setActiveView("all")}
      />
    );
  }

  return (
    <div className="app-container">
      {/* Sandwich Bar Collapsible Navigation */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeView={activeView}
        onSelectView={(v) => setActiveView(v)}
        onRunDemo={handleRunOfficialDemo}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenBenchmark={() => setIsBenchmarkOpen(true)}
        isLoading={isLoading}
        hasRun={!!runId}
        runId={runId}
        datasetName={datasetName}
      />

      {/* Top Header with Sandwich Toggle */}
      <Header
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onRunDemo={handleRunOfficialDemo}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenBenchmark={() => setIsBenchmarkOpen(true)}
        isLoading={isLoading}
        activeDatasetName={datasetName}
        hasRun={!!runId}
        activeView={activeView}
        onSelectView={(v) => setActiveView(v)}
        currentUser={currentUser}
      />

      <main className="main-content">
        {/* ========================================================
            VIEW 1: EXECUTIVE OVERVIEW (activeView === 'all')
            Shows Executive KPI cards, What Changed explainability,
            active feature & downloads toolbar, and the interactive
            Subsystem Hub grid (with 1-click jumps to dedicated views).
           ======================================================== */}
        {activeView === "all" && (
          <div className="view-container overview-view">
            {summary && <MetricsSummary summary={summary} />}

            {summary?.what_changed_summary && (
              <WhatChangedCard statements={summary.what_changed_summary} />
            )}

            {runId && (
              <div className="action-toolbar">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>
                    Active Telemetry Feature:
                  </span>
                  <select
                    value={targetFeature}
                    onChange={(e) => {
                      setTargetFeature(e.target.value);
                      if (runId) loadRunData(runId, selectedSensorId, e.target.value);
                    }}
                    className="feature-select"
                  >
                    <option value="temperature">Temperature (°C)</option>
                    <option value="humidity">Relative Humidity (%)</option>
                    <option value="pressure">Barometric Pressure (hPa)</option>
                    <option value="air_quality">Air Quality Index (AQI)</option>
                    <option value="noise_level">Acoustic Noise Level (dB)</option>
                  </select>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setIsBenchmarkOpen(true)}
                  >
                    <BarChartIcon size={13} />
                    <span>View Benchmark</span>
                  </button>

                  <a
                    href={getDownloadDenoisedUrl(runId)}
                    className="btn btn-outline btn-sm"
                    download
                    title="Download full clean telemetry CSV with all provenance columns"
                  >
                    <DownloadIcon size={13} />
                    <span>Download Clean CSV</span>
                  </a>

                  <a
                    href={getDownloadAnomaliesUrl(runId)}
                    className="btn btn-outline btn-sm"
                    download
                    title="Download filtered anomaly report CSV"
                  >
                    <DownloadIcon size={13} />
                    <span>Download Anomaly Report</span>
                  </a>
                </div>
              </div>
            )}

            {/* Executive Subsystems Command Hub */}
            <div className="overview-hub-section">
              <div className="overview-hub-header">
                <h3 className="overview-hub-title">Engine Subsystems</h3>
                <p className="overview-hub-subtitle">
                  Select a subsystem to inspect.
                </p>
              </div>

              <div className="overview-hub-grid">
                {/* 1. Twin Signal Denoising */}
                <div className="overview-hub-card" onClick={() => setActiveView("charts")}>
                  <div className="hub-card-top">
                    <div className="hub-icon-box" style={{ background: "#eff6ff", color: "#2563eb" }}>
                      <ActivityIcon size={20} />
                    </div>
                    <span className="hub-badge" style={{ background: "#dbeafe", color: "#1e40af" }}>
                      Synchronized
                    </span>
                  </div>
                  <h4 className="hub-card-title">Twin Signal Denoising</h4>
                  <p className="hub-card-desc">
                    Raw vs denoised signal charts.
                  </p>
                  <div className="hub-card-footer">
                    <span className="hub-stat">Sensor {selectedSensorId} • {targetFeature}</span>
                    <span className="hub-action-link">Open Charts <ChevronRightIcon size={14} /></span>
                  </div>
                </div>

                {/* 2. Spatial Sensor Network */}
                <div className="overview-hub-card" onClick={() => setActiveView("spatial")}>
                  <div className="hub-card-top">
                    <div className="hub-icon-box" style={{ background: "#ecfdf5", color: "#059669" }}>
                      <MapPinIcon size={20} />
                    </div>
                    <span className="hub-badge" style={{ background: "#d1fae5", color: "#065f46" }}>
                      {sensorNetwork.length || 50} Stations
                    </span>
                  </div>
                  <h4 className="hub-card-title">Spatial Sensor Network</h4>
                  <p className="hub-card-desc">
                    2D sensor map and station health.
                  </p>
                  <div className="hub-card-footer">
                    <span className="hub-stat">Selected: {selectedSensorId}</span>
                    <span className="hub-action-link">Open Map <ChevronRightIcon size={14} /></span>
                  </div>
                </div>

                {/* 3. Anomaly Provenance Log */}
                <div className="overview-hub-card" onClick={() => setActiveView("anomalies")}>
                  <div className="hub-card-top">
                    <div className="hub-icon-box" style={{ background: "#fff7ed", color: "#ea580c" }}>
                      <AlertTriangleIcon size={20} />
                    </div>
                    <span className="hub-badge" style={{ background: "#ffedd5", color: "#9a3412" }}>
                      {anomalies.length} Flagged
                    </span>
                  </div>
                  <h4 className="hub-card-title">Anomaly Provenance Log</h4>
                  <p className="hub-card-desc">
                    Audit log of flagged anomalies.
                  </p>
                  <div className="hub-card-footer">
                    <span className="hub-stat">{summary?.detected_anomalies ?? anomalies.length} Anomalies Logged</span>
                    <span className="hub-action-link">Open Log <ChevronRightIcon size={14} /></span>
                  </div>
                </div>

                {/* 4. Quantum VQC Engine */}
                <div className="overview-hub-card" onClick={() => setActiveView("quantum")}>
                  <div className="hub-card-top">
                    <div className="hub-icon-box" style={{ background: "#f5f3ff", color: "#7c3aed" }}>
                      <CpuIcon size={20} />
                    </div>
                    <span className="hub-badge" style={{ background: "#ede9fe", color: "#5b21b6" }}>
                      4 Qubits • 12 Params
                    </span>
                  </div>
                  <h4 className="hub-card-title">Quantum VQC Engine</h4>
                  <p className="hub-card-desc">
                    4-Qubit quantum variational circuit.
                  </p>
                  <div className="hub-card-footer">
                    <span className="hub-stat">Advantage: Quantum Edge</span>
                    <span className="hub-action-link">Open Circuit <ChevronRightIcon size={14} /></span>
                  </div>
                </div>

                {/* 5. Processing Architecture */}
                <div className="overview-hub-card" onClick={() => setActiveView("pipeline")}>
                  <div className="hub-card-top">
                    <div className="hub-icon-box" style={{ background: "#f0fdf4", color: "#16a34a" }}>
                      <LayersIcon size={20} />
                    </div>
                    <span className="hub-badge" style={{ background: "#dcfce7", color: "#15803d" }}>
                      10 Steps Complete
                    </span>
                  </div>
                  <h4 className="hub-card-title">Processing Architecture</h4>
                  <p className="hub-card-desc">
                    10-stage processing pipeline.
                  </p>
                  <div className="hub-card-footer">
                    <span className="hub-stat">Sub-second Realtime</span>
                    <span className="hub-action-link">Open Pipeline <ChevronRightIcon size={14} /></span>
                  </div>
                </div>

                {/* 6. Simulation Studio */}
                <div className="overview-hub-card" onClick={() => setActiveView("simulation")}>
                  <div className="hub-card-top">
                    <div className="hub-icon-box" style={{ background: "#faf5ff", color: "#9333ea" }}>
                      <SlidersIcon size={20} />
                    </div>
                    <span className="hub-badge" style={{ background: "#f3e8ff", color: "#6b21a8" }}>
                      Generator
                    </span>
                  </div>
                  <h4 className="hub-card-title">Simulation Studio</h4>
                  <p className="hub-card-desc">
                    Generate synthetic sensor data.
                  </p>
                  <div className="hub-card-footer">
                    <span className="hub-stat">{datasetName.split(" ")[0]}</span>
                    <span className="hub-action-link">Open Studio <ChevronRightIcon size={14} /></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            VIEW 2: TWIN SIGNAL INSPECTION (activeView === 'charts')
           ======================================================== */}
        {activeView === "charts" && (
          <div className="view-container charts-view">
            {runId && (
              <div className="action-toolbar">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>
                    Active Telemetry Feature:
                  </span>
                  <select
                    value={targetFeature}
                    onChange={(e) => {
                      setTargetFeature(e.target.value);
                      if (runId) loadRunData(runId, selectedSensorId, e.target.value);
                    }}
                    className="feature-select"
                  >
                    <option value="temperature">Temperature (°C)</option>
                    <option value="humidity">Relative Humidity (%)</option>
                    <option value="pressure">Barometric Pressure (hPa)</option>
                    <option value="air_quality">Air Quality Index (AQI)</option>
                    <option value="noise_level">Acoustic Noise Level (dB)</option>
                  </select>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setIsBenchmarkOpen(true)}
                  >
                    <BarChartIcon size={13} />
                    <span>View Benchmark</span>
                  </button>

                  <a
                    href={getDownloadDenoisedUrl(runId)}
                    className="btn btn-outline btn-sm"
                    download
                    title="Download full clean telemetry CSV with all provenance columns"
                  >
                    <DownloadIcon size={13} />
                    <span>Download Clean CSV</span>
                  </a>
                </div>
              </div>
            )}

            <SynchronizedCharts
              points={seriesPoints}
              selectedSensorId={selectedSensorId}
              targetFeature={targetFeature}
              selectedTimestamp={selectedPoint ? selectedPoint.timestamp : null}
              onSelectPoint={(p) => setSelectedPoint(p)}
            />

            <AnomalyInspector
              point={selectedPoint}
              onClear={() => setSelectedPoint(null)}
            />
          </div>
        )}

        {/* ========================================================
            VIEW 3: SPATIAL SENSOR NETWORK (activeView === 'spatial')
           ======================================================== */}
        {activeView === "spatial" && (
          <div className="view-container spatial-view">
            <SensorMap
              sensors={sensorNetwork}
              selectedSensorId={selectedSensorId}
              onSelectSensor={handleSelectSensor}
            />
          </div>
        )}

        {/* ========================================================
            VIEW 4: ANOMALY PROVENANCE LOG (activeView === 'anomalies')
           ======================================================== */}
        {activeView === "anomalies" && (
          <div className="view-container anomalies-view">
            {runId && (
              <div className="action-toolbar" style={{ justifyContent: "flex-end" }}>
                <a
                  href={getDownloadAnomaliesUrl(runId)}
                  className="btn btn-outline btn-sm"
                  download
                  title="Download filtered anomaly report CSV"
                >
                  <DownloadIcon size={13} />
                  <span>Download Anomaly Report CSV</span>
                </a>
              </div>
            )}

            <AnomalyInspector
              point={selectedPoint}
              onClear={() => setSelectedPoint(null)}
            />

            <AnomalyTable
              anomalies={anomalies}
              onSelectAnomaly={handleSelectAnomaly}
            />
          </div>
        )}

        {/* ========================================================
            VIEW 5: QUANTUM VQC ENGINE (activeView === 'quantum')
           ======================================================== */}
        {activeView === "quantum" && (
          <div className="view-container quantum-view">
            <QuantumDrawer quantumMeta={summary?.quantum_metadata} />
          </div>
        )}

        {/* ========================================================
            VIEW 6: PROCESSING PIPELINE ARCHITECTURE (activeView === 'pipeline')
           ======================================================== */}
        {activeView === "pipeline" && (
          <div className="view-container pipeline-view">
            <PipelineVisualizer />
          </div>
        )}

        {/* ========================================================
            VIEW 7: SIMULATION TELEMETRY STUDIO (activeView === 'simulation')
           ======================================================== */}
        {activeView === "simulation" && (
          <div className="view-container simulation-view">
            <SimulationStudio
              onDatasetGenerated={(newDatasetId, newName) => {
                setDatasetName(newName);
              }}
              onRunPipeline={handleRunPipelineOnDataset}
              isParentLoading={isLoading}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUpload={handleCustomUpload}
        isLoading={isLoading}
      />

      <BenchmarkModal
        isOpen={isBenchmarkOpen}
        onClose={() => setIsBenchmarkOpen(false)}
        data={benchmarkData}
      />

      {/* Mobile Bottom Navigation Bar (Optimized for Mobile APK & Touch) */}
      <BottomNav
        activeView={activeView}
        onSelectView={(v) => setActiveView(v)}
        onOpenMenu={() => setIsSidebarOpen(true)}
        anomalyCount={anomalies.length}
      />
    </div>
  );
};

export default App;
