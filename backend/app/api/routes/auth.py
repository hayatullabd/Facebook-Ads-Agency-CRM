import re

from beanie import PydanticObjectId
from fastapi import APIRouter
from pymongo.errors import DuplicateKeyError

from app.core.config import get_settings
from app.core.responses import ApiError, success
from app.core.security import create_access_token, hash_password, password_policy_error, verify_password
from app.models.documents import Agency, User, now_utc
from app.schemas.inputs import LoginInput, RegisterInput
from app.services.serialization import document_dict, public_user

router = APIRouter(prefix="/auth", tags=["auth"])


def slugify(value: str) -> str:
    return re.sub(r"^-|-$", "", re.sub(r"[^a-z0-9]+", "-", value.lower()))


@router.post("/register")
async def register(body: RegisterInput):
    if not get_settings().allow_public_registration:
        raise ApiError(403, "Public registration is disabled")
    error = password_policy_error(body.password)
    if error:
        raise ApiError(400, error)
    agency_id, user_id = PydanticObjectId(), PydanticObjectId()
    agency = Agency(id=agency_id, name=body.agencyName, slug=slugify(body.agencyName), owner=user_id)
    user = User(id=user_id, agency=agency_id, name=body.name, email=body.email.lower(), passwordHash=hash_password(body.password), role="admin")
    try:
        await agency.insert()
        await user.insert()
    except DuplicateKeyError:
        await Agency.find_one({"_id": agency_id}).delete() if await Agency.find_one({"_id": agency_id}) else None
        raise ApiError(409, "Agency slug or email is already in use") from None
    token = create_access_token(user_id=str(user.id), agency_id=str(agency.id), role=user.role, client_id=None)
    return success({"user": public_user(user), "agency": document_dict(agency), "token": token}, "Account created", 201)


@router.post("/login")
async def login(body: LoginInput):
    query = {"email": body.email.lower()}
    if body.agencySlug:
        agency = await Agency.find_one({"slug": body.agencySlug.lower()})
        if not agency:
            raise ApiError(401, "Invalid email or password")
        query["agency"] = agency.id
    users = await User.find(query).limit(2).to_list()
    if not body.agencySlug and len(users) > 1:
        raise ApiError(409, "Multiple workspaces use this email; provide your agency slug")
    user = users[0] if users else None
    if not user or not user.isActive or not verify_password(body.password, user.passwordHash):
        raise ApiError(401, "Invalid email or password")
    user.lastLoginAt = now_utc()
    await user.save()
    agency = await Agency.get(user.agency)
    token = create_access_token(user_id=str(user.id), agency_id=str(user.agency), role=user.role, client_id=str(user.client) if user.client else None)
    return success({"user": public_user(user), "agency": document_dict(agency) if agency else None, "token": token}, "Logged in")
