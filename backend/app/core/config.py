import secrets
from functools import lru_cache
from typing import Annotated, Literal
from urllib.parse import urlparse

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    environment: Literal["development", "test", "production"] = "development"
    app_name: str = "Facebook Ads Agency CRM"
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_database: str = "facebook_ads_crm"
    jwt_secret: str = Field(default_factory=lambda: secrets.token_urlsafe(48))
    jwt_expire_minutes: int = 10080
    allow_public_registration: bool = False
    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:5173"]
    trusted_hosts: Annotated[list[str], NoDecode] = []
    max_body_bytes: int = 1_048_576
    rate_limit_per_minute: int = 180
    facebook_token_encryption_key: str = Field(default_factory=lambda: secrets.token_urlsafe(48))
    facebook_graph_version: str = "v20.0"
    facebook_request_timeout_seconds: float = 15
    facebook_sync_max_pages: int = Field(default=50, ge=1, le=100)
    redis_url: str = ""
    production_docs_enabled: bool = False
    sync_retention_days: int = 90

    @field_validator("cors_origins", "trusted_hosts", mode="before")
    @classmethod
    def split_csv(cls, value):
        if isinstance(value, str):
            return [part.strip().rstrip("/") for part in value.split(",") if part.strip()]
        return value

    @model_validator(mode="after")
    def validate_production(self):
        if self.environment == "production":
            weak_markers = ("change-me", "replace-with", "development-only", "placeholder")
            local_hosts = {"localhost", "127.0.0.1", "::1"}
            if "jwt_secret" not in self.model_fields_set or len(self.jwt_secret) < 32 or any(marker in self.jwt_secret.lower() for marker in weak_markers):
                raise ValueError("JWT_SECRET must be explicitly configured with a strong, non-placeholder production secret")

            mongo = urlparse(self.mongodb_uri)
            if "mongodb_uri" not in self.model_fields_set or mongo.scheme not in {"mongodb", "mongodb+srv"} or not mongo.hostname:
                raise ValueError("MONGODB_URI must be explicitly configured as an absolute production MongoDB URI")
            if mongo.hostname.lower() in local_hosts:
                raise ValueError("MONGODB_URI must not use localhost or 127.0.0.1 in production")

            encryption_key = self.facebook_token_encryption_key.strip()
            if "facebook_token_encryption_key" not in self.model_fields_set or len(encryption_key) < 32 or any(marker in encryption_key.lower() for marker in weak_markers):
                raise ValueError("FACEBOOK_TOKEN_ENCRYPTION_KEY must be explicitly configured with a strong, non-placeholder production secret")

            if "cors_origins" not in self.model_fields_set or not self.cors_origins:
                raise ValueError("CORS_ORIGINS must be explicitly configured in production")
            for origin in self.cors_origins:
                parsed = urlparse(origin)
                if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.path not in {"", "/"} or parsed.params or parsed.query or parsed.fragment:
                    raise ValueError("CORS_ORIGINS must contain absolute HTTP(S) origins")
                if parsed.hostname.lower() in local_hosts:
                    raise ValueError("CORS_ORIGINS must not contain localhost or 127.0.0.1 in production")

            if "trusted_hosts" not in self.model_fields_set or not self.trusted_hosts:
                raise ValueError("TRUSTED_HOSTS must be explicitly configured in production")
            if any(host.lower() in local_hosts or host == "*" for host in self.trusted_hosts):
                raise ValueError("TRUSTED_HOSTS must not contain local hosts or wildcards in production")

            redis = urlparse(self.redis_url)
            if "redis_url" not in self.model_fields_set or redis.scheme not in {"redis", "rediss"} or not redis.hostname:
                raise ValueError("REDIS_URL must be explicitly configured as an absolute Redis URL in production")
            if redis.hostname.lower() in local_hosts:
                raise ValueError("REDIS_URL must not use localhost or 127.0.0.1 in production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
