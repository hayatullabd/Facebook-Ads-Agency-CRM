from collections.abc import Callable

import jwt
from beanie import PydanticObjectId
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.responses import ApiError
from app.core.security import decode_access_token
from app.models.documents import Client, User

bearer = HTTPBearer(auto_error=False)


async def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)) -> User:
    if not credentials:
        raise ApiError(401, "Authentication required")
    try:
        payload = decode_access_token(credentials.credentials)
        user = await User.get(PydanticObjectId(payload["sub"]))
    except (jwt.PyJWTError, KeyError, ValueError):
        raise ApiError(401, "Invalid or expired token") from None
    if not user or not user.isActive:
        raise ApiError(401, "User is inactive or no longer exists")
    if str(user.agency) != str(payload.get("agency")):
        raise ApiError(401, "Invalid tenant token")
    return user


async def agency_user(agency_id: str, user: User = Depends(current_user)) -> User:
    try:
        valid_id = PydanticObjectId(agency_id)
    except ValueError:
        raise ApiError(422, "Invalid agency ID") from None
    if user.agency != valid_id:
        raise ApiError(403, "You do not have access to this agency")
    return user


def roles(*allowed: str) -> Callable:
    async def dependency(user: User = Depends(agency_user)) -> User:
        if user.role not in allowed:
            raise ApiError(403, "You do not have permission to perform this action")
        return user
    return dependency


def client_filter(user: User) -> dict:
    if user.role in ("client", "moderator"):
        if not user.client:
            raise ApiError(403, "User is not linked to a client")
        return {"client": user.client}
    return {}


async def require_client(agency_id: str, client_id: PydanticObjectId, user: User) -> Client:
    client = await Client.find_one({"_id": client_id, "agency": PydanticObjectId(agency_id)})
    if not client:
        raise ApiError(400, "Client does not belong to this agency")
    if user.role in ("client", "moderator") and user.client != client.id:
        raise ApiError(403, "You do not have access to this client")
    return client
