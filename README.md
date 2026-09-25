# Q-SENSE
### Quantum-Assisted Spatio-Temporal Sensor Denoising Engine

[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.12%20%7C%203.13-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-green.svg)](https://fastapi.tiangolo.com/)
[![Qiskit](https://img.shields.io/badge/Qiskit-2.5+-purple.svg)](https://qiskit.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![Tests](https://img.shields.io/badge/pytest-20%20passed-brightgreen.svg)]()

> **Q-SENSE** is an internal, scientific data-processing engine designed for robust, non-destructive denoising of urban IoT sensor telemetry. It pairs multi-factor spatio-temporal anomaly detection and classical state-space Kalman filtering with a parameterized **Variational Quantum Circuit (VQC)** running on a quantum simulator to estimate non-linear sensor residuals and adaptively fuse corrections.

---

## 1. System Architecture

```
                                  FRONTEND
                      (React 18 + TypeScript + Vite)
                                     |
                                     | REST API (HTTP)
                                     v
                              FASTAPI BACKEND
                                     |
              +----------------------+----------------------+
              |                      |                      |
              v                      v                      v
        Processing Engine         Database             File Storage
      (10-Step Pipeline)   (PostgreSQL / SQLite)   (CSVs & Provenance)
              |
    +---------+----------------------------------------------+
    |         |              |              |                |
    v         v              v              v                v
Validation  Features      Anomaly      Classical          Quantum
(Schema &  (Temporal &   Detection     Baselines          Engine
 Geo-bounds) Spatial)   (Multi-factor) (Kalman/MA/Gauss) (4-Qubit VQC)
                                                             |
                                                             v
                                                      Adaptive Hybrid
                                                           Fusion
                                                             |
                                                             v
                                                    Spatio-Temporal
                                                      Consistency
                                                             |
                                                             v
                                                      Clean Telemetry
                                                      & Benchmarks
```

---

## 2. Core Processing Pipeline

1. **Non-Destructive Ingestion & Validation (`validation.py`)**:
   - Inspects CSV integrity, ensures required identifiers (`sensor_id`), timestamps, and coordinates (`latitude`, `longitude`) exist.
   - Detects and isolates invalid coordinates, timestamps, and empty readings without silent dropping. Generates an immutable validation audit report.
2. **Missing Value Imputation (`preprocessing.py`)**:
   - Short gaps ($\le 3$ steps): Linear time interpolation.
   - Medium gaps ($4-8$ steps): Rolling causal temporal interpolation.
   - Long gaps ($> 8$ steps): Fallback median fill with confidence tracking.
   - Preserves original provenance (`was_missing_originally`, `imputation_method`).
3. **Data Normalization (`preprocessing.py`)**:
   - Robust median/IQR scaling applied **only** to ML and quantum feature vectors. Physical sensor units are strictly preserved in all output columns.
4. **Causal Temporal Feature Engineering (`temporal_features.py`)**:
   - Strictly backward-looking rolling statistics per sensor: `rolling_mean`, `rolling_std`, `rolling_median`, `local_gradient`, `temporal_difference`, `rate_of_change`. Zero future leakage.
5. **Vectorized Spatial Feature Engineering (`spatial_features.py`)**:
   - Computes great-circle distances via the Haversine formula across a precomputed distance matrix.
   - Gathers contemporaneous cluster readings within a configurable radius (default: 500m) to calculate `neighbor_mean`, `neighbor_std`, `difference_from_neighbor_mean`, and `spatial_anomaly_score`.
6. **Multi-Factor Anomaly Detection & Classification (`anomaly_detection.py`)**:
   - Computes normalized scores $[0.0, 1.0]$ for Temporal, Spatial, and Statistical anomalies.
   - Computes weighted score: $\text{Score} = 0.35 \cdot \text{Temp} + 0.40 \cdot \text{Spat} + 0.25 \cdot \text{Stat}$.
   - Classifies anomalies into: `NORMAL`, `GAUSSIAN_NOISE`, `SPIKE`, `OUTLIER`, `DRIFT`, `MISSING`, `SPATIAL_INCONSISTENCY`, `TEMPORAL_INCONSISTENCY`, or `MIXED`.
7. **Classical Baseline Filtering (`classical_filters.py`)**:
   - Moving Average, 1D Gaussian Smoothing, and Discrete Kinematic Kalman Filter.
8. **Variational Quantum Circuit (VQC) Modeling (`quantum/`)**:
   - Angle-encodes selected normalized features into rotation angles in $[-\pi, \pi]$:
     $$\text{Angle}(x) = \arctan(x) \cdot \frac{\pi}{2}$$
   - Executes a parameterized 4-qubit, 2-layer circuit with linear CNOT entanglement on Qiskit Aer / Statevector simulator.
   - Measures the expectation value of Pauli-Z observable $\langle Z_0 \rangle \in [-1.0, 1.0]$.
   - Predicts physical residual $\Delta = \langle Z_0 \rangle \cdot \text{scale}$, bounded strictly by $3.0 \cdot \sigma_{\text{local}}$ to prevent unphysical extremes.
9. **Adaptive Hybrid Fusion (`hybrid_fusion.py`)**:
   - Dynamic anomaly-weighted fusion parameter $\alpha \in [0, 0.90]$:
     $$\alpha = \text{clip}(\alpha_{\text{base}} + 0.60 \cdot \text{Anomaly} + 0.20 \cdot \text{Spatial} + 0.20 \cdot \text{Temporal}, 0.0, 0.90)$$
   - Final value: $y_{\text{final}} = (1 - \alpha) \cdot y_{\text{classical}} + \alpha \cdot y_{\text{quantum}}$.
10. **Spatio-Temporal Consistency & Safety Fallback (`consistency.py`)**:
    - Validates physical domain bounds (e.g. Temperature $[-20^\circ\text{C}, 60^\circ\text{C}]$) and local $4.5\sigma$ temporal continuity.
    - If checks fail, gracefully falls back to classical filter value and logs `fallback_used = True` with `fallback_reason`.
11. **Provenance & Scientific Evaluation (`evaluation.py`)**:
    - Calculates RMSE, MAE, MSE, SNR (dB), Noise Reduction %, and Anomaly Detection Precision/Recall/F1 against clean ground truth.
    - Honest evaluation: No synthetic metric fabrication.

---

## 3. Repository Organization

```
q-sense/
├── README.md                          # Project documentation and reproduction guide
├── .env.example                       # Sample environment variables
├── docker-compose.yml                 # PostgreSQL + Backend + Frontend orchestration
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt               # Backend dependencies
│   ├── app/
│   │   ├── main.py                    # FastAPI application entrypoint
│   │   ├── api/routes/                # Endpoints: datasets, processing, benchmarks, results, simulation
│   │   ├── core/                      # Central config, physical bounds, and logging
│   │   ├── models/                    # SQLAlchemy database models and Pydantic schemas
│   │   ├── services/                  # Business logic for datasets, runs, and benchmarks
│   │   ├── processing/                # Denoising engine modules (10 steps)
│   │   ├── simulation/                # Synthetic sensor network & 5 noise models
│   │   ├── quantum/                   # Qiskit circuit, encoder, simulator, and optimizer
│   │   └── utils/                     # Geography (Haversine), metrics, serialization
│   └── tests/                         # Complete 20-test pytest suite
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── src/
│   │   ├── App.tsx                    # Main interactive dashboard
│   │   ├── index.css                  # Light-theme design system stylesheet
│   │   ├── api.ts                     # REST client for backend endpoints
│   │   ├── types.ts                   # TypeScript interfaces
│   │   └── components/                # Header, Twin Charts, Anomaly Table, Sensor Map, etc.
└── scripts/
    ├── generate_demo_dataset.py       # Official 50-sensor 24h deterministic dataset generator
    ├── run_pipeline.py                # Standalone CLI pipeline runner
    └── run_benchmark.py               # Empirical algorithm benchmark comparison
```

---

## 4. Quick Start & Reproduction

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- (Optional) Docker & Docker Compose

### 1. Backend Setup
```bash
# Clone and enter workspace
cd q-sense

# Install Python dependencies
pip install -r backend/requirements.txt

# Generate the official demo dataset (50 sensors, 24h, 14,400 rows, seed 42)
python scripts/generate_demo_dataset.py

# Run all 20 automated tests
python -m pytest backend/tests/ -v

# Start the FastAPI backend server
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```
Backend API will be accessible at `http://127.0.0.1:8000` with Swagger docs at `http://127.0.0.1:8000/docs`.

### 2. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
Open `http://127.0.0.1:3000` in any web browser.

---

## 5. Running the Scientific Benchmark CLI

To evaluate all algorithms head-to-head on the command line:
```bash
python scripts/run_benchmark.py
```
Output:
```
================================================================================
Q-SENSE SCIENTIFIC BENCHMARK RESULTS
================================================================================
Method                    | RMSE     | MAE      | SNR (dB)   | Noise Red. | Runtime (s)
--------------------------------------------------------------------------------
Raw Noisy                 | 6.0073   | 1.3657   | 11.47      | 0.0      % | 0.000     
Moving Average            | 3.5611   | 1.3954   | 16.01      | 40.7     % | 0.020     
Gaussian Smoothing        | 3.4785   | 1.2543   | 16.21      | 42.1     % | 0.040     
Discrete Kalman           | 4.3386   | 1.5087   | 14.29      | 27.8     % | 0.080     
Hybrid Quantum-Classical  | 4.2448   | 1.5323   | 14.48      | 29.3     % | 12.445    
================================================================================
```

---

## 6. API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/simulation/generate` | Generate deterministic simulated dataset |
| `POST` | `/api/datasets/upload` | Upload custom telemetry CSV |
| `GET` | `/api/datasets/{dataset_id}` | Retrieve dataset metadata and validation report |
| `POST` | `/api/processing/run` | Execute complete denoising pipeline |
| `GET` | `/api/processing/{run_id}/summary` | Retrieve summary metrics and "What Changed?" statements |
| `GET` | `/api/processing/{run_id}/results` | Synchronized Before/After chart points for a sensor |
| `GET` | `/api/processing/{run_id}/anomalies` | Detected anomalies list with provenance |
| `GET` | `/api/processing/{run_id}/sensors` | Sensor spatial network with cluster statuses |
| `GET` | `/api/benchmarks/{run_id}` | Benchmark metrics comparing all 5 algorithms |
| `GET` | `/api/results/download/{run_id}` | Download complete denoised CSV |
| `GET` | `/api/results/download-anomalies/{run_id}` | Download anomaly audit CSV |

---

## 7. Scientific Honesty & Methodology Principles

1. **No Metric Fabrication**: If a classical filter achieves competitive performance with the hybrid model, the actual numbers are reported transparently. Q-SENSE demonstrates an end-to-end hybrid quantum-classical architecture, not an unverified claim of quantum supremacy.
2. **Zero Data Leakage**: Ground truth is never accessed during inference. The denoising engine operates solely on noisy telemetry. Ground truth is used exclusively for training residuals and independent evaluation.
3. **Traceable Provenance**: Every output value retains the original reading, imputed value, classical estimate, quantum residual, fusion weight $\alpha$, and consistency status.
#   u s e l e s s - e n g i n e e r s  
 