import React, { useState, useEffect } from "react";
import {
  SlidersIcon,
  PlayIcon,
  RefreshCwIcon,
  DownloadIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  DatabaseIcon,
  ActivityIcon,
  LayersIcon,
  InfoIcon
} from "./Icons";
import {
  generateCustomSimulation,
  getLatestSimulation,
  getDownloadSimulationUrl
} from "../api";
import type { SimulationConfig, SimulationMetadata } from "../types";

interface SimulationStudioProps {
  onDatasetGenerated: (datasetId: string, name: string) => void;
  onRunPipeline: (datasetId: string) => void;
  isParentLoading: boolean;
}

export const SimulationStudio: React.FC<SimulationStudioProps> = ({
  onDatasetGenerated,
  onRunPipeline,
  isParentLoading,
}) => {
  // Config state
  const [numSensors, setNumSensors] = useState<number>(50);
  const [durationHours, setDurationHours] = useState<number>(24);
  const [samplingInterval, setSamplingInterval] = useState<number>(5);
  const [randomSeed, setRandomSeed] = useState<number>(42);

  // Noise fraction state (in percentages 0-100 for easy UI)
  const [gaussianPct, setGaussianPct] = useState<number>(5.0);
  const [spikePct, setSpikePct] = useState<number>(1.5);
  const [outlierPct, setOutlierPct] = useState<number>(1.0);
  const [driftPct, setDriftPct] = useState<number>(2.0);
  const [missingPct, setMissingPct] = useState<number>(1.5);

  // Status & Metadata state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<SimulationMetadata | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Live calculation of expected telemetry matrix
  const pointsPerSensor = Math.floor((durationHours * 60) / samplingInterval);
  const totalRows = numSensors * pointsPerSensor;

  // Load latest simulation info on mount
  useEffect(() => {
    fetchLatestMetadata();
  }, []);

  const fetchLatestMetadata = async () => {
    try {
      const res = await getLatestSimulation();
      if (res.success && res.data) {
        setActiveDatasetId(res.data.dataset_id);
        if (res.metadata) {
          setMetadata(res.metadata as SimulationMetadata);
          if (res.metadata.number_of_sensors) setNumSensors(res.metadata.number_of_sensors);
          if (res.metadata.duration_hours) setDurationHours(res.metadata.duration_hours);
          if (res.metadata.sampling_interval_minutes) setSamplingInterval(res.metadata.sampling_interval_minutes);
          if (res.metadata.random_seed) setRandomSeed(res.metadata.random_seed);
          if (res.metadata.noise_configuration) {
            const nc = res.metadata.noise_configuration;
            if (nc.gaussian !== undefined) setGaussianPct(Number((nc.gaussian * 100).toFixed(1)));
            if (nc.spike !== undefined) setSpikePct(Number((nc.spike * 100).toFixed(1)));
            if (nc.outlier !== undefined) setOutlierPct(Number((nc.outlier * 100).toFixed(1)));
            if (nc.drift !== undefined) setDriftPct(Number((nc.drift * 100).toFixed(1)));
            if (nc.missing !== undefined) setMissingPct(Number((nc.missing * 100).toFixed(1)));
          }
        }
      }
    } catch (err) {
      console.warn("Could not load initial simulation metadata:", err);
    }
  };

  // Presets
  const applyPreset = (preset: "standard" | "dense" | "fast" | "stress") => {
    setErrorMsg(null);
    setSuccessMsg(null);
    switch (preset) {
      case "standard":
        setNumSensors(50);
        setDurationHours(24);
        setSamplingInterval(5);
        setRandomSeed(42);
        setGaussianPct(5.0);
        setSpikePct(1.5);
        setOutlierPct(1.0);
        setDriftPct(2.0);
        setMissingPct(1.5);
        break;
      case "dense":
        setNumSensors(80);
        setDurationHours(12);
        setSamplingInterval(5);
        setRandomSeed(101);
        setGaussianPct(6.0);
        setSpikePct(2.0);
        setOutlierPct(1.5);
        setDriftPct(2.5);
        setMissingPct(2.0);
        break;
      case "fast":
        setNumSensors(20);
        setDurationHours(6);
        setSamplingInterval(10);
        setRandomSeed(77);
        setGaussianPct(4.0);
        setSpikePct(1.0);
        setOutlierPct(0.5);
        setDriftPct(1.0);
        setMissingPct(1.0);
        break;
      case "stress":
        setNumSensors(50);
        setDurationHours(24);
        setSamplingInterval(5);
        setRandomSeed(999);
        setGaussianPct(12.0);
        setSpikePct(3.5);
        setOutlierPct(2.0);
        setDriftPct(5.0);
        setMissingPct(4.0);
        break;
    }
  };

  // Trigger generation
  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const config: SimulationConfig = {
      number_of_sensors: numSensors,
      duration_hours: durationHours,
      sampling_interval_minutes: samplingInterval,
      random_seed: randomSeed,
      noise_fractions: {
        gaussian: gaussianPct / 100,
        spike: spikePct / 100,
        outlier: outlierPct / 100,
        drift: driftPct / 100,
        missing: missingPct / 100,
      },
    };

    try {
      const res = await generateCustomSimulation(config);
      if (!res.success) {
        const msg = res.errors?.map((e: any) => e.message).join(", ") || "Failed to generate dataset";
        setErrorMsg(msg);
        return;
      }

      setActiveDatasetId(res.data.dataset_id);
      if (res.metadata) {
        setMetadata(res.metadata as SimulationMetadata);
      }
      setSuccessMsg(`Synthetic telemetry generated successfully: ${res.data.row_count.toLocaleString()} observations across ${res.data.sensor_count} IoT stations.`);
      onDatasetGenerated(res.data.dataset_id, `${res.data.name} (${res.data.sensor_count} Sensors, Seed ${randomSeed})`);
    } catch (err: any) {
      setErrorMsg(err.message || "Network error generating simulation dataset");
    } finally {
      setIsGenerating(false);
    }
  };

  const isBusy = isGenerating || isParentLoading;

  return (
    <div className="simulation-studio-container">
      {/* Studio Header Card */}
      <div className="card studio-header-card">
        <div className="studio-header-flex">
          <div className="studio-header-main">
            <div className="studio-icon-badge">
              <SlidersIcon size={22} />
            </div>
            <div className="studio-header-text">
              <div className="studio-title-row">
                <h2 className="studio-title">
                  Deterministic Simulation Studio
                </h2>
                <div className="studio-badges">
                  <span className="badge badge-normal" style={{ fontSize: 11 }}>
                    Section 40 & 31 Verified
                  </span>
                  {metadata && (
                    <span className="badge badge-quantum" style={{ fontSize: 11 }}>
                      Seed: {metadata.random_seed}
                    </span>
                  )}
                </div>
              </div>
              <p className="studio-desc">
                Synthesize reproducible urban IoT sensor meshes with diurnal physics and calibrated noise injections.
              </p>
            </div>
          </div>

          {/* Quick Preset Selector Buttons */}
          <div className="preset-selector-wrapper">
            <span className="preset-label">
              Presets:
            </span>
            <div className="preset-button-grid">
              <button
                className="btn btn-outline btn-sm preset-btn"
                onClick={() => applyPreset("standard")}
                disabled={isBusy}
                title="Official 50 Sensors, 24 Hours, 5 min interval, Seed 42"
              >
                Standard (50s/24h)
              </button>
              <button
                className="btn btn-outline btn-sm preset-btn"
                onClick={() => applyPreset("dense")}
                disabled={isBusy}
                title="Dense 80-station urban deployment"
              >
                Dense (80s/12h)
              </button>
              <button
                className="btn btn-outline btn-sm preset-btn"
                onClick={() => applyPreset("fast")}
                disabled={isBusy}
                title="Fast lightweight run for rapid test iterations"
              >
                Rapid (20s/6h)
              </button>
              <button
                className="btn btn-outline btn-sm preset-btn preset-stress-btn"
                onClick={() => applyPreset("stress")}
                disabled={isBusy}
                title="Heavy Glitches & Multi-Channel Drift"
              >
                Heavy Stress
              </button>
            </div>
          </div>
        </div>

        {/* Alerts / Banners */}
        {successMsg && (
          <div className="alert-banner alert-success" style={{ marginTop: 14 }}>
            <CheckCircleIcon size={16} />
            <span style={{ flex: 1, fontSize: 13 }}>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="alert-banner alert-error" style={{ marginTop: 14 }}>
            <AlertTriangleIcon size={16} />
            <span style={{ flex: 1, fontSize: 13 }}>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Main Two-Column Controls Grid */}
      <div className="studio-grid">
        {/* Column 1: Network & Temporal Configuration */}
        <div className="card studio-card">
          <div className="studio-card-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <DatabaseIcon size={18} className="text-blue" />
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                1. Spatial Network & Temporal Scope
              </h3>
            </div>
            <span className="badge badge-normal" style={{ fontSize: 11 }}>
              Determinism Enabled
            </span>
          </div>

          <div className="studio-form">
            {/* Number of Sensors */}
            <div className="form-group">
              <div className="form-label-row">
                <label>Number of IoT Sensors</label>
                <span className="form-val-badge">{numSensors} Stations</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={numSensors}
                onChange={(e) => setNumSensors(Number(e.target.value))}
                disabled={isBusy}
                className="studio-slider"
              />
              <div className="slider-ticks">
                <span>10 stations</span>
                <span>50 (default)</span>
                <span>100 stations</span>
              </div>
              <p className="form-help">
                Station IDs assigned from S001 to S{String(numSensors).padStart(3, "0")} with calibrated spatial Haversine coordinates in a 2.5km urban radius.
              </p>
            </div>

            {/* Observation Duration */}
            <div className="form-group">
              <div className="form-label-row">
                <label>Observation Duration</label>
                <span className="form-val-badge">{durationHours} Hours</span>
              </div>
              <div className="button-toggle-grid">
                {[6, 12, 24, 48].map((h) => (
                  <button
                    key={h}
                    type="button"
                    className={`toggle-option-btn ${durationHours === h ? "active" : ""}`}
                    onClick={() => setDurationHours(h)}
                    disabled={isBusy}
                  >
                    {h}h {h === 24 ? "(1 Day)" : h === 48 ? "(2 Days)" : ""}
                  </button>
                ))}
              </div>
              <p className="form-help">
                Full diurnal ambient temperature and commuter traffic cycles synthesized with realistic microclimate variations.
              </p>
            </div>

            {/* Sampling Interval */}
            <div className="form-group">
              <div className="form-label-row">
                <label>Sampling Frequency / Interval</label>
                <span className="form-val-badge">Every {samplingInterval} Mins</span>
              </div>
              <div className="button-toggle-grid">
                {[1, 5, 10, 15].map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`toggle-option-btn ${samplingInterval === m ? "active" : ""}`}
                    onClick={() => setSamplingInterval(m)}
                    disabled={isBusy}
                  >
                    {m} min {m === 5 ? "(Recommended)" : ""}
                  </button>
                ))}
              </div>
              <p className="form-help">
                Cadence of synchronous multi-channel telemetry readings per sensor node.
              </p>
            </div>

            {/* Random Seed */}
            <div className="form-group">
              <div className="form-label-row">
                <label>Deterministic Random Seed</label>
                <span className="form-val-badge">Seed #{randomSeed}</span>
              </div>
              <div className="seed-input-row">
                <input
                  type="number"
                  value={randomSeed}
                  onChange={(e) => setRandomSeed(parseInt(e.target.value) || 0)}
                  disabled={isBusy}
                  className="input-text-field seed-input"
                />
                <div className="seed-btn-group">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm seed-btn"
                    onClick={() => setRandomSeed(42)}
                    disabled={isBusy}
                  >
                    Reset (42)
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm seed-btn"
                    onClick={() => setRandomSeed(Math.floor(Math.random() * 9000) + 100)}
                    disabled={isBusy}
                  >
                    Randomize
                  </button>
                </div>
              </div>
              <p className="form-help">
                Fixed seeds guarantee identical reproducible datasets across both judges' machines and test suites.
              </p>
            </div>

            {/* Real-Time Telemetry Matrix Projection */}
            <div className="matrix-projection-box">
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <ActivityIcon size={14} className="text-blue" />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Projected Telemetry Volume
                </span>
              </div>
              <div className="matrix-stat-row">
                <div className="matrix-stat-item">
                  <div className="stat-label">Timestamps / Sensor</div>
                  <div className="stat-value">{pointsPerSensor.toLocaleString()}</div>
                </div>
                <div className="matrix-stat-item">
                  <div className="stat-label">IoT Sensor Nodes</div>
                  <div className="stat-value">{numSensors}</div>
                </div>
                <div className="matrix-stat-item highlighted">
                  <div className="stat-label">Total Observations</div>
                  <div className="stat-value">{totalRows.toLocaleString()}</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 8 }}>
                Features Synthesized: <strong>Temperature (°C)</strong>, <strong>Humidity (%)</strong>, <strong>Pressure (hPa)</strong>, <strong>Air Quality (AQI)</strong>, <strong>Noise Level (dB)</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Calibrated Noise Models Profile */}
        <div className="card studio-card">
          <div className="studio-card-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <LayersIcon size={18} className="text-purple" />
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                2. Stochastic Noise & Fault Injection Profile
              </h3>
            </div>
            <span className="badge badge-quantum" style={{ fontSize: 11 }}>
              Section 24 Standard
            </span>
          </div>

          <div className="studio-form">
            {/* Gaussian Noise */}
            <div className="form-group">
              <div className="form-label-row">
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="noise-dot bg-blue"></span>
                  <label>Gaussian Perturbation (Thermal / ADC Jitter)</label>
                </div>
                <span className="form-val-badge">{gaussianPct.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={15}
                step={0.5}
                value={gaussianPct}
                onChange={(e) => setGaussianPct(Number(e.target.value))}
                disabled={isBusy}
                className="studio-slider"
              />
              <p className="form-help">
                Normal continuous background fluctuations: ~0.45σ additive white noise across sensor readings.
              </p>
            </div>

            {/* Spikes */}
            <div className="form-group">
              <div className="form-label-row">
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="noise-dot bg-red"></span>
                  <label>Impulse Spikes (Electromagnetic / Glitches)</label>
                </div>
                <span className="form-val-badge">{spikePct.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={5}
                step={0.1}
                value={spikePct}
                onChange={(e) => setSpikePct(Number(e.target.value))}
                disabled={isBusy}
                className="studio-slider"
              />
              <p className="form-help">
                Sudden isolated spikes of +4.0σ to +8.5σ amplitude simulating radio bursts and supply transients.
              </p>
            </div>

            {/* Extreme Outliers */}
            <div className="form-group">
              <div className="form-label-row">
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="noise-dot bg-amber"></span>
                  <label>Hardware Outliers (Bit-Flips / Failures)</label>
                </div>
                <span className="form-val-badge">{outlierPct.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={3}
                step={0.1}
                value={outlierPct}
                onChange={(e) => setOutlierPct(Number(e.target.value))}
                disabled={isBusy}
                className="studio-slider"
              />
              <p className="form-help">
                Extreme anomalous values exceeding physical limits (e.g. 75°C temperatures or negative humidities).
              </p>
            </div>

            {/* Sensor Drift */}
            <div className="form-group">
              <div className="form-label-row">
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="noise-dot bg-purple"></span>
                  <label>Gradual Calibration Drift (Aging Sensors)</label>
                </div>
                <span className="form-val-badge">{driftPct.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={8}
                step={0.2}
                value={driftPct}
                onChange={(e) => setDriftPct(Number(e.target.value))}
                disabled={isBusy}
                className="studio-slider"
              />
              <p className="form-help">
                Progressive diurnal slope shift injected into selected stations (e.g. S012, S024, S038) over time.
              </p>
            </div>

            {/* Missing Telemetry */}
            <div className="form-group">
              <div className="form-label-row">
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="noise-dot bg-slate"></span>
                  <label>Missing Telemetry (Packet Loss / Sleep Dropout)</label>
                </div>
                <span className="form-val-badge">{missingPct.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={5}
                step={0.1}
                value={missingPct}
                onChange={(e) => setMissingPct(Number(e.target.value))}
                disabled={isBusy}
                className="studio-slider"
              />
              <p className="form-help">
                Unrecorded null / NaN slots requiring multi-strategy causal interpolation during Step 2.
              </p>
            </div>

            {/* Spatial Anomaly Notice */}
            <div style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, color: "#475569" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, color: "#334155", marginBottom: 3 }}>
                <InfoIcon size={14} />
                <span>Geographic Cluster Consistency Target</span>
              </div>
              Station <strong>S005</strong> is automatically designated as an urban heat-island spatial anomaly for spatial radius (r = 500m) neighbor deviation testing.
            </div>
          </div>
        </div>
      </div>

      {/* Execution Action Panel */}
      <div className="card studio-action-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
              Ready to Synthesize Dataset
            </div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              Writes deterministic CSVs & metadata into the database and data engine directory.
            </div>
          </div>

          <div className="studio-action-btn-row">
            <button
              className="btn btn-primary studio-action-btn"
              onClick={handleGenerate}
              disabled={isBusy}
            >
              {isGenerating ? (
                <>
                  <RefreshCwIcon size={15} className="spin" />
                  <span>Synthesizing Telemetry...</span>
                </>
              ) : (
                <>
                  <PlayIcon size={15} />
                  <span>Generate Simulation Telemetry</span>
                </>
              )}
            </button>

            {activeDatasetId && (
              <button
                className="btn btn-success studio-action-btn"
                onClick={() => onRunPipeline(activeDatasetId)}
                disabled={isBusy}
                title="Immediately run 10-step quantum-assisted denoising on this newly generated dataset"
              >
                {isParentLoading ? (
                  <>
                    <RefreshCwIcon size={15} className="spin" />
                    <span>Denoising Pipeline Running...</span>
                  </>
                ) : (
                  <>
                    <ActivityIcon size={15} />
                    <span>Run Denoising on This Dataset</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Section 31 Automated Quality Check Audit Card */}
      {metadata && metadata.quality_report && (
        <div className="card studio-audit-card">
          <div className="studio-card-header">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="audit-pass-badge">
                <CheckCircleIcon size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                  Section 31 Automated Quality Check Audit
                </h3>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  Generated on {new Date(metadata.generation_timestamp).toLocaleString()} • Engine Version {metadata.dataset_version}
                </div>
              </div>
            </div>
            <span className="badge badge-normal" style={{ fontSize: 12, padding: "4px 10px", fontWeight: 700 }}>
              STATUS: {metadata.quality_report.status}
            </span>
          </div>

          {/* Audit Metrics Grid */}
          <div className="audit-metrics-grid">
            <div className="audit-metric-item">
              <span className="audit-lbl">Verified Total Observations</span>
              <strong className="audit-val">{metadata.quality_report.total_rows.toLocaleString()}</strong>
              <span className="audit-sub">Matches expected dimension</span>
            </div>

            <div className="audit-metric-item">
              <span className="audit-lbl">Active IoT Sensor Nodes</span>
              <strong className="audit-val">{metadata.quality_report.total_sensors} Stations</strong>
              <span className="audit-sub">Coordinates verified</span>
            </div>

            <div className="audit-metric-item">
              <span className="audit-lbl">Injected Anomaly Labels</span>
              <strong className="audit-val" style={{ color: "#d97706" }}>
                {metadata.quality_report.corrupted_labels_count.toLocaleString()}
              </strong>
              <span className="audit-sub">Multi-channel ground truth</span>
            </div>

            <div className="audit-metric-item">
              <span className="audit-lbl">Missing Value Gaps</span>
              <strong className="audit-val" style={{ color: "#475569" }}>
                {metadata.quality_report.missing_values_count.toLocaleString()}
              </strong>
              <span className="audit-sub">NaN slots requiring Step 2</span>
            </div>
          </div>

          {/* Verified Noise Types Present */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
              Verified Active Noise Patterns in Synthetic Stream:
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {metadata.quality_report.noise_types_present.map((type) => (
                <span key={type} className="badge badge-quantum" style={{ fontSize: 11, padding: "3px 8px" }}>
                  {type}
                </span>
              ))}
            </div>
          </div>

          {/* Download Generated Artifacts Action Row */}
          <div className="audit-download-row">
            <div style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
              Download Generated Benchmark Artifacts:
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a
                href={getDownloadSimulationUrl("noisy")}
                className="btn btn-outline btn-sm"
                download
                title="Download noisy sensor observations CSV"
              >
                <DownloadIcon size={13} />
                <span>noisy_sensor_data.csv</span>
              </a>
              <a
                href={getDownloadSimulationUrl("ground_truth")}
                className="btn btn-outline btn-sm"
                download
                title="Download clean ground truth baseline CSV"
              >
                <DownloadIcon size={13} />
                <span>ground_truth.csv</span>
              </a>
              <a
                href={getDownloadSimulationUrl("labels")}
                className="btn btn-outline btn-sm"
                download
                title="Download per-observation noise label ground truth CSV"
              >
                <DownloadIcon size={13} />
                <span>noise_labels.csv</span>
              </a>
              <a
                href={getDownloadSimulationUrl("metadata")}
                className="btn btn-outline btn-sm"
                download
                title="Download parameter configuration and Section 31 audit report JSON"
              >
                <DownloadIcon size={13} />
                <span>metadata.json</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
