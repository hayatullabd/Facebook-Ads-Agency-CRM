import re
from datetime import UTC, datetime, timedelta

import jwt
from pwdlib import PasswordHash

from app.core.config import get_settings

password_hash = PasswordHash.recommended()


def password_policy_error(password: str) -> str | None:
    if len(password) < 12 or len(password) > 128:
        return "Password must be between 12 and 128 characters"
    checks = [r"[a-z]", r"[A-Z]", r"\d", r"[^A-Za-z0-9]"]
    if not all(re.search(check, password) for check in checks):
        return "Password must include uppercase, lowercase, number, and special character"
    return None


def hash_password(password: str) -> str:
    error = password_policy_error(password)
    if error:
        raise ValueError(error)
    return password_hash.hash(password)


def verify_password(password: str, encoded: str) -> bool:
    return password_hash.verify(password, encoded)


def create_access_token(*, user_id: str, agency_id: str, role: str, client_id: str | None) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload = {
        "sub": user_id,
        "agency": agency_id,
        "role": role,
        "client": client_id,
        "iat": now,
        "exp": now + timedelta(minutes=settings.jwt_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_access_token(token: str) -> dict:
    settings = get_settings()
    return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
