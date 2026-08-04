from fastapi.testclient import TestClient

from app.main import create_app


def test_live_health_and_security_headers():
    with TestClient(create_app(skip_database=True)) as client:
        response = client.get("/health/live", headers={"X-Request-ID": "test-request"})
    assert response.status_code == 200
    assert response.json() == {"success": True, "status": "live"}
    assert response.headers["x-request-id"] == "test-request"
    assert response.headers["x-content-type-options"] == "nosniff"


def test_ready_reports_unavailable_without_database():
    with TestClient(create_app(skip_database=True)) as client:
        response = client.get("/health/ready")
    assert response.status_code == 503
    assert response.json()["success"] is False


def test_missing_auth_uses_error_envelope():
    with TestClient(create_app(skip_database=True)) as client:
        response = client.get("/api/clients/507f1f77bcf86cd799439011")
    assert response.status_code == 401
    assert response.json()["success"] is False
    assert response.json()["message"] == "Authentication required"
    assert response.json()["requestId"]
