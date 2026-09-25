export interface AnomalyItem {
  id: string;
  timestamp: string;
  sensor_id: string;
  feature: string;
  original_value: number | null;
  classical_value: number | null;
  quantum_correction: number | null;
  final_value: number | null;
  anomaly_type: string;
  anomaly_score: number;
  fusion_weight: number;
  fallback_used: boolean;
  consistency_status: string;
}

export interface TimeSeriesPoint {
  timestamp: string;
  sensor_id: string;
  original_value: number | null;
  denoised_value: number | null;
  classical_value: number | null;
  quantum_correction: number | null;
  fusion_weight: number;
  anomaly_score: number;
  anomaly_type: string;
  is_anomaly: boolean;
  fallback_used: boolean;
}

export interface SensorMetadata {
  sensor_id: string;
  latitude: number;
  longitude: number;
  status: "normal" | "warning" | "anomaly";
  anomaly_count: number;
  avg_fusion_weight: number;
  mean_denoised: number;
}

export interface RunSummary {
  run_id?: string;
  dataset_id?: string;
  status?: string;
  total_records: number;
  sensor_count: number;
  detected_anomalies: number;
  corrected_readings: number;
  missing_values_count: number;
  evaluation_available: boolean;
  target_feature: string;
  what_changed_summary: string[];
  rmse_before?: number;
  rmse_after?: number;
  mae_before?: number;
  mae_after?: number;
  snr_before?: number;
  snr_after?: number;
  noise_reduction_percentage?: number;
  quantum_metadata?: {
    num_qubits?: number;
    num_layers?: number;
    num_parameters?: number;
    initial_loss?: number;
    final_loss?: number;
    simulator?: string;
    residual_scale?: number;
    loss_history?: number[];
  };
}

export interface BenchmarkMetrics {
  rmse: number;
  mae: number;
  mse: number;
  snr: number;
  noise_reduction_percentage: number;
  runtime_seconds: number;
}

export interface BenchmarkData {
  raw: BenchmarkMetrics;
  moving_average: BenchmarkMetrics;
  gaussian: BenchmarkMetrics;
  kalman: BenchmarkMetrics;
  hybrid_quantum: BenchmarkMetrics;
  anomaly_detection?: {
    precision: number;
    recall: number;
    f1_score: number;
    true_positives: number;
    false_positives: number;
    false_negatives: number;
  };
  quantum_advantage_demonstrated: boolean;
  honest_assessment: string;
}

export interface SimulationConfig {
  number_of_sensors: number;
  duration_hours: number;
  sampling_interval_minutes: number;
  random_seed: number;
  noise_fractions?: {
    gaussian: number;
    spike: number;
    outlier: number;
    drift: number;
    missing: number;
  };
  preset?: string;
}

export interface SimulationMetadata {
  random_seed: number;
  number_of_sensors: number;
  duration_hours: number;
  sampling_interval_minutes: number;
  total_rows: number;
  noise_configuration: {
    gaussian: number;
    spike: number;
    outlier: number;
    drift: number;
    missing: number;
  };
  feature_configuration: string[];
  dataset_version: string;
  generation_timestamp: string;
  quality_report?: {
    status: string;
    total_rows: number;
    total_sensors: number;
    corrupted_labels_count: number;
    missing_values_count: number;
    noise_types_present: string[];
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  metadata?: Record<string, any>;
  errors?: Array<{ code: string; message: string }>;
}
