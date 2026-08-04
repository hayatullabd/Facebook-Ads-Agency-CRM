import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings
from app.core.responses import ApiError


def _fernet() -> Fernet:
    secret = get_settings().facebook_token_encryption_key
    if not secret:
        if get_settings().environment == "production":
            raise RuntimeError("Facebook encryption key is not configured")
        secret = get_settings().jwt_secret
    key = base64.urlsafe_b64encode(hashlib.sha256(secret.encode()).digest())
    return Fernet(key)


def encrypt_token(token: str) -> str:
    return _fernet().encrypt(token.encode()).decode()


def decrypt_token(value: str) -> str:
    try:
        return _fernet().decrypt(value.encode()).decode()
    except InvalidToken:
        raise ApiError(500, "Stored Facebook credential cannot be decrypted") from None
