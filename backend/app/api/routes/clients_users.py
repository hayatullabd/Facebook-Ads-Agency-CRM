from beanie import PydanticObjectId
from fastapi import APIRouter, Depends
from pymongo.errors import DuplicateKeyError

from app.api.deps import agency_user, client_filter, require_client, roles
from app.core.responses import ApiError, success
from app.core.security import hash_password, password_policy_error
from app.models.documents import Campaign, Client, User
from app.schemas.inputs import ClientInput, ClientPatch, FacebookAccountsInput, UserInput
from app.services.serialization import document_dict, public_user

router = APIRouter(tags=["clients-users"])


@router.get("/clients/{agency_id}")
async def clients_list(agency_id: str, user: User = Depends(agency_user)):
    query = {"agency": PydanticObjectId(agency_id), **client_filter(user)}
    return success([document_dict(item) for item in await Client.find(query).sort("-createdAt").to_list()])


@router.post("/clients/{agency_id}")
async def client_create(agency_id: str, body: ClientInput, user: User = Depends(roles("admin", "team"))):
    client = Client(agency=PydanticObjectId(agency_id), **body.model_dump())
    try:
        await client.insert()
    except DuplicateKeyError:
        raise ApiError(409, "A client with this email already exists") from None
    return success(document_dict(client), "Client created", 201)


async def get_client(agency_id: str, client_id: str, user: User) -> Client:
    try:
        client = await Client.find_one({"_id": PydanticObjectId(client_id), "agency": PydanticObjectId(agency_id)})
    except ValueError:
        client = None
    if not client:
        raise ApiError(404, "Client not found")
    if user.role in ("client", "moderator") and client.id != user.client:
        raise ApiError(403, "You do not have access to this client")
    return client


@router.patch("/clients/{agency_id}/{client_id}")
async def client_patch(agency_id: str, client_id: str, body: ClientPatch, user: User = Depends(roles("admin", "team"))):
    client = await get_client(agency_id, client_id, user)
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(client, key, value)
    await client.save()
    return success(document_dict(client), "Client updated")


@router.patch("/clients/{agency_id}/{client_id}/facebook-accounts")
async def client_accounts(agency_id: str, client_id: str, body: FacebookAccountsInput, user: User = Depends(roles("admin", "team"))):
    client = await get_client(agency_id, client_id, user)
    previous = set(client.facebookAdAccountIds)
    if body.facebookAdAccountIds is not None:
        account_ids = body.facebookAdAccountIds
    elif body.facebookAdAccountId and body.assigned is not None:
        account_ids = list(client.facebookAdAccountIds)
        if body.assigned and body.facebookAdAccountId not in account_ids:
            account_ids.append(body.facebookAdAccountId)
        elif not body.assigned:
            account_ids = [value for value in account_ids if value != body.facebookAdAccountId]
    else:
        raise ApiError(422, "Provide facebookAdAccountIds or facebookAdAccountId with assigned")
    client.facebookAdAccountIds = account_ids
    client.adAccountId = account_ids[0] if account_ids else ""
    await client.save()
    removed = list(previous - set(account_ids))
    if removed:
        await Campaign.find({"agency": client.agency, "client": client.id, "facebookAdAccountId": {"$in": removed}}).update_many({"$set": {"client": None}})
    if account_ids:
        await Campaign.find({"agency": client.agency, "facebookAdAccountId": {"$in": account_ids}}).update_many({"$set": {"client": client.id}})
    return success(document_dict(client), "Facebook accounts assigned")


@router.delete("/clients/{agency_id}/{client_id}")
async def client_delete(agency_id: str, client_id: str, user: User = Depends(roles("admin"))):
    client = await get_client(agency_id, client_id, user)
    if await User.find_one({"agency": client.agency, "client": client.id}):
        raise ApiError(409, "Client has linked users and cannot be deleted")
    await client.delete()
    return success(None, "Client deleted")


@router.get("/users/{agency_id}")
async def users_list(agency_id: str, user: User = Depends(agency_user)):
    query = {"agency": PydanticObjectId(agency_id)}
    if user.role in ("client", "moderator"):
        query["client"] = user.client
    users = await User.find(query).sort("-createdAt").to_list()
    result = []
    for item in users:
        linked = await Client.get(item.client) if item.client else None
        result.append(public_user(item, linked))
    return success(result)


@router.post("/users/{agency_id}")
async def user_create(agency_id: str, body: UserInput, actor: User = Depends(roles("admin", "team", "client"))):
    if actor.role == "team" and body.role not in ("client", "moderator"):
        raise ApiError(403, "Team users may create only client or moderator users")
    if actor.role == "client" and (body.role != "moderator" or body.client != actor.client):
        raise ApiError(403, "Client users may create moderators for their own client only")
    if body.role in ("client", "moderator"):
        if not body.client:
            raise ApiError(400, "client is required for this role")
        await require_client(agency_id, body.client, actor)
    error = password_policy_error(body.password)
    if error:
        raise ApiError(400, error)
    user = User(agency=PydanticObjectId(agency_id), name=body.name, email=body.email.lower(), passwordHash=hash_password(body.password), role=body.role, client=body.client, avatarColor=body.avatarColor)
    try:
        await user.insert()
    except DuplicateKeyError:
        raise ApiError(409, "Email is already in use in this agency") from None
    return success(public_user(user), "User created", 201)


@router.delete("/users/{agency_id}/{user_id}")
async def user_delete(agency_id: str, user_id: str, actor: User = Depends(roles("admin", "team", "client"))):
    target = await User.find_one({"_id": PydanticObjectId(user_id), "agency": PydanticObjectId(agency_id)})
    if not target:
        raise ApiError(404, "User not found")
    if target.id == actor.id or target.role == "admin":
        raise ApiError(403, "This user cannot be removed")
    if actor.role == "team" and target.role not in ("client", "moderator"):
        raise ApiError(403, "Team users cannot remove this role")
    if actor.role == "client" and (target.role != "moderator" or target.client != actor.client):
        raise ApiError(403, "Client users may remove only their moderators")
    await target.delete()
    return success(None, "User deleted")
