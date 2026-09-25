import numpy as np
import pandas as pd
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Tuple


def generate_sensor_network(
    num_sensors: int = 50,
    center_lat: float = 37.7749,
    center_lon: float = -122.4194,
    seed: int = 42
) -> pd.DataFrame:
    """
    Generate realistic spatial clusters for 50 sensors in an urban area.
    Returns DataFrame with columns: sensor_id, latitude, longitude, altitude, cluster_id, microclimate_offset
    """
    rng = np.random.default_rng(seed)

    # Create 5 distinct urban zones/clusters
    num_clusters = 5
    cluster_centers_lat = center_lat + rng.uniform(-0.03, 0.03, num_clusters)
    cluster_centers_lon = center_lon + rng.uniform(-0.03, 0.03, num_clusters)

    sensors = []
    sensors_per_cluster = num_sensors // num_clusters

    for c in range(num_clusters):
        c_lat = cluster_centers_lat[c]
        c_lon = cluster_centers_lon[c]
        cluster_microclimate = rng.normal(0.0, 0.8)

        count = sensors_per_cluster if c < num_clusters - 1 else num_sensors - (sensors_per_cluster * (num_clusters - 1))
        for i in range(count):
            s_idx = len(sensors) + 1
            s_id = f"S{s_idx:03d}"
            # Scatter within ~400-800 meters of cluster center
            lat = c_lat + rng.normal(0, 0.0035)
            lon = c_lon + rng.normal(0, 0.0035)
            altitude = float(np.clip(rng.normal(25.0, 10.0), 5.0, 150.0))
            # Individual sensor baseline offset
            sensor_offset = float(cluster_microclimate + rng.normal(0.0, 0.3))

            sensors.append({
                "sensor_id": s_id,
                "latitude": round(float(lat), 6),
                "longitude": round(float(lon), 6),
                "altitude": round(altitude, 1),
                "cluster_id": c,
                "microclimate_offset": round(sensor_offset, 3)
            })

    return pd.DataFrame(sensors)


def generate_clean_telemetry(
    sensors_df: pd.DataFrame,
    duration_hours: int = 24,
    sampling_interval_minutes: int = 5,
    start_time: datetime = datetime(2026, 6, 1, 0, 0, 0, tzinfo=timezone.utc),
    seed: int = 42
) -> pd.DataFrame:
    """
    Generate realistic, physically consistent clean sensor telemetry.
    24 hours * (60 / 5) = 288 timestamps per sensor.
    Total rows for 50 sensors = 14,400.
    """
    rng = np.random.default_rng(seed)
    num_steps = int((duration_hours * 60) / sampling_interval_minutes)
    timestamps = [start_time + timedelta(minutes=i * sampling_interval_minutes) for i in range(num_steps)]

    # Time-of-day in fractional hours (0.0 to 24.0)
    hours = np.array([t.hour + t.minute / 60.0 for t in timestamps])

    all_rows = []

    for _, sensor in sensors_df.iterrows():
        s_id = sensor["sensor_id"]
        lat = sensor["latitude"]
        lon = sensor["longitude"]
        offset = sensor["microclimate_offset"]

        # 1. Temperature: Diurnal cycle (peak ~15:00, trough ~05:00) + microclimate offset
        # Base mean 22°C, daily swing ±7°C
        diurnal_phase = 2.0 * np.pi * (hours - 9.0) / 24.0
        clean_temp = (
            22.0
            + 7.0 * np.sin(diurnal_phase)
            + offset
            + 0.2 * np.sin(4.0 * np.pi * hours / 24.0)
        )

        # 2. Humidity: Inversely correlated with temperature
        # Range approx 40% to 85%
        clean_humidity = (
            65.0
            - 20.0 * np.sin(diurnal_phase)
            - 1.5 * offset
            + 0.5 * np.cos(4.0 * np.pi * hours / 24.0)
        )
        clean_humidity = np.clip(clean_humidity, 20.0, 98.0)

        # 3. Barometric Pressure: Slow synoptic atmospheric variation (1013 hPa baseline)
        synoptic_wave = 1013.25 + 2.5 * np.sin(2.0 * np.pi * (hours + 3.0) / 36.0) - (sensor["altitude"] * 0.12)
        clean_pressure = synoptic_wave + 0.1 * np.cos(diurnal_phase)

        # 4. Air Quality (AQI): Peak during morning commute (7-9 AM) and evening rush (17-19 PM)
        # Baseline ~35 (Good), commuter peaks push up to 85
        morning_rush = np.exp(-0.5 * ((hours - 8.2) / 1.5) ** 2)
        evening_rush = np.exp(-0.5 * ((hours - 18.0) / 1.8) ** 2)
        clean_aqi = (
            35.0
            + 35.0 * morning_rush
            + 40.0 * evening_rush
            + max(0.0, offset * 2.0)
            + 2.0 * np.sin(2.0 * np.pi * hours / 24.0)
        )
        clean_aqi = np.clip(clean_aqi, 10.0, 300.0)

        # 5. Noise Level (dB): Quiet at night (35-42 dB), high during daytime activities (55-75 dB)
        day_activity = 1.0 / (1.0 + np.exp(-1.5 * (hours - 6.5))) - 1.0 / (1.0 + np.exp(-1.5 * (hours - 22.0)))
        traffic_bursts = 10.0 * (morning_rush + evening_rush)
        clean_noise = 38.0 + 22.0 * day_activity + traffic_bursts + 0.5 * offset
        clean_noise = np.clip(clean_noise, 30.0, 110.0)

        for i, t in enumerate(timestamps):
            all_rows.append({
                "sensor_id": s_id,
                "timestamp": t.strftime("%Y-%m-%d %H:%M:%S"),
                "latitude": lat,
                "longitude": lon,
                "temperature": round(float(clean_temp[i]), 3),
                "humidity": round(float(clean_humidity[i]), 3),
                "pressure": round(float(clean_pressure[i]), 3),
                "air_quality": round(float(clean_aqi[i]), 3),
                "noise_level": round(float(clean_noise[i]), 3)
            })

    df = pd.DataFrame(all_rows)
    # Ensure sorted by sensor_id and timestamp
    df.sort_values(by=["sensor_id", "timestamp"], inplace=True)
    df.reset_index(drop=True, inplace=True)
    return df
