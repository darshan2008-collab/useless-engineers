import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_root_and_health():
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["engine"] == "Q-SENSE"

    health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["status"] == "healthy"


def test_simulation_generation_api():
    payload = {
        "number_of_sensors": 10,
        "duration_hours": 2,
        "sampling_interval_minutes": 5,
        "random_seed": 42
    }
    res = client.post("/api/simulation/generate", json=payload)
    assert res.status_code == 200
    json_data = res.json()
    assert json_data["success"] == True
    assert "dataset_id" in json_data["data"]
    assert json_data["data"]["row_count"] == 240  # 10 sensors * 24 steps
