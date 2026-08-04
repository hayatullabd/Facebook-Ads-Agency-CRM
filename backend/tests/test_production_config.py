import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core.config import Settings


VALID_PRODUCTION = {
    "environment": "production",
    "mongodb_uri": "mongodb+srv://user:password@cluster.example.com/database",
    "jwt_secret": "a-strong-production-jwt-secret-that-is-long-enough",
    "facebook_token_encryption_key": "a-strong-production-encryption-key-that-is-long-enough",
    "cors_origins": ["https://app.example.com"],
    "trusted_hosts": ["api.example.com"],
    "redis_url": "rediss://cache.example.com:6379/0",
}


@pytest.mark.parametrize(
    ("field", "value", "message"),
    [
        ("mongodb_uri", None, "MONGODB_URI"),
        ("mongodb_uri", "mongodb://localhost:27017/database", "MONGODB_URI"),
        ("mongodb_uri", "mongodb://127.0.0.1:27017/database", "MONGODB_URI"),
        ("redis_url", None, "REDIS_URL"),
        ("redis_url", "redis://localhost:6379/0", "REDIS_URL"),
        ("redis_url", "redis://127.0.0.1:6379/0", "REDIS_URL"),
        ("cors_origins", None, "CORS_ORIGINS"),
        ("cors_origins", ["http://localhost:5173"], "CORS_ORIGINS"),
        ("cors_origins", ["http://127.0.0.1:5173"], "CORS_ORIGINS"),
        ("cors_origins", ["app.example.com"], "CORS_ORIGINS"),
        ("trusted_hosts", None, "TRUSTED_HOSTS"),
        ("trusted_hosts", ["localhost"], "TRUSTED_HOSTS"),
        ("trusted_hosts", ["127.0.0.1"], "TRUSTED_HOSTS"),
    ],
)
def test_production_rejects_missing_or_unsafe_infrastructure(field, value, message):
    values = VALID_PRODUCTION.copy()
    if value is None:
        values.pop(field)
    else:
        values[field] = value

    with pytest.raises(ValidationError, match=message):
        Settings(_env_file=None, **values)


def test_production_docs_are_disabled_and_security_headers_are_enabled(monkeypatch):
    production_settings = Settings(_env_file=None, **VALID_PRODUCTION)

    import app.main as main_module

    monkeypatch.setattr(main_module, "get_settings", lambda: production_settings)

    with TestClient(main_module.create_app(skip_database=True), base_url="https://api.example.com") as client:
        docs = client.get("/docs")
        openapi = client.get("/openapi.json")
        health = client.get("/health/live")

    assert docs.status_code == 404
    assert openapi.status_code == 404
    assert health.headers["strict-transport-security"] == "max-age=31536000; includeSubDomains"
    assert health.headers["content-security-policy"].startswith("default-src 'none'")
