import type {
  ApiResponse,
  RunSummary,
  AnomalyItem,
  TimeSeriesPoint,
  SensorMetadata,
  BenchmarkData,
  SimulationConfig,
  SimulationMetadata
} from "./types";

const API_BASE = "http://127.0.0.1:8000/api";

export async function uploadDataset(file: File): Promise<ApiResponse<any>> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/datasets/upload`, {
    method: "POST",
    body: formData,
  });
  return res.json();
}

export async function generateDemoSimulation(): Promise<ApiResponse<any>> {
  return generateCustomSimulation({
    number_of_sensors: 50,
    duration_hours: 24,
    sampling_interval_minutes: 5,
    random_seed: 42,
  });
}

export async function generateCustomSimulation(config: SimulationConfig): Promise<ApiResponse<any>> {
  const res = await fetch(`${API_BASE}/simulation/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  return res.json();
}

export async function getLatestSimulation(): Promise<ApiResponse<any>> {
  const res = await fetch(`${API_BASE}/simulation/latest`);
  return res.json();
}

export function getDownloadSimulationUrl(fileType: "noisy" | "ground_truth" | "labels" | "metadata"): string {
  return `${API_BASE}/simulation/download/${fileType}`;
}

export async function startProcessingRun(datasetId: string, feature: string = "temperature"): Promise<ApiResponse<any>> {
  const res = await fetch(`${API_BASE}/processing/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dataset_id: datasetId,
      config: {
        spatial_radius_meters: 500,
        temporal_window: 5,
        temporal_weight: 0.35,
        spatial_weight: 0.40,
        statistical_weight: 0.25,
        num_qubits: 4,
        num_layers: 2,
        shots: 1024,
        seed: 42,
        base_alpha: 0.10,
        anomaly_gain: 0.60,
        spatial_gain: 0.20,
        temporal_gain: 0.20,
        max_alpha: 0.90,
        target_feature: feature,
      },
    }),
  });
  return res.json();
}

export async function getRunSummary(runId: string): Promise<ApiResponse<RunSummary>> {
  const res = await fetch(`${API_BASE}/processing/${runId}/summary`);
  return res.json();
}

export async function getRunResults(
  runId: string,
  sensorId: string = "S001",
  feature: string = "temperature"
): Promise<ApiResponse<{ sensor_id: string; feature: string; series: TimeSeriesPoint[] }>> {
  const res = await fetch(`${API_BASE}/processing/${runId}/results?sensor_id=${sensorId}&feature=${feature}`);
  return res.json();
}

export async function getRunAnomalies(runId: string, limit: number = 200): Promise<ApiResponse<AnomalyItem[]>> {
  const res = await fetch(`${API_BASE}/processing/${runId}/anomalies?limit=${limit}`);
  return res.json();
}

export async function getSensorNetwork(runId: string): Promise<ApiResponse<SensorMetadata[]>> {
  const res = await fetch(`${API_BASE}/processing/${runId}/sensors`);
  return res.json();
}

export async function getBenchmarkResults(runId: string): Promise<ApiResponse<BenchmarkData>> {
  const res = await fetch(`${API_BASE}/benchmarks/${runId}`);
  return res.json();
}

export function getDownloadDenoisedUrl(runId: string): string {
  return `${API_BASE}/results/download/${runId}`;
}

export function getDownloadAnomaliesUrl(runId: string): string {
  return `${API_BASE}/results/download-anomalies/${runId}`;
}
