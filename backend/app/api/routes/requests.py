from datetime import UTC, datetime

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends

from app.api.deps import agency_user, client_filter, require_client, roles
from app.core.responses import ApiError, success
from app.models.documents import ActivityLog, AdRequest, Campaign, Client, ClientUpdate, Invoice, User
from app.schemas.inputs import RequestInput, RequestPatch, StatusInput
from app.services.serialization import document_dict, populate

router = APIRouter(prefix="/requests", tags=["requests"])


async def request_dto(item: AdRequest) -> dict:
    return await populate(item, {"client": Client, "submittedBy": User, "reviewedBy": User})


async def scoped_request(agency_id: str, request_id: str, user: User) -> AdRequest:
    try:
        query = {"_id": PydanticObjectId(request_id), "agency": PydanticObjectId(agency_id), **client_filter(user)}
        item = await AdRequest.find_one(query)
    except ValueError:
        item = None
    if not item:
        raise ApiError(404, "Ad request not found")
    return item


async def log(item: AdRequest, user: User, action: str, detail: str, metadata: dict | None = None):
    await ActivityLog(agency=item.agency, actor=user.id, client=item.client, adRequest=item.id, entityType="ad_request", entityId=item.id, action=action, detail=detail, metadata=metadata or {}).insert()


@router.get("/{agency_id}")
async def request_list(agency_id: str, user: User = Depends(agency_user)):
    query = {"agency": PydanticObjectId(agency_id), **client_filter(user)}
    return success([await request_dto(item) for item in await AdRequest.find(query).sort("-createdAt").to_list()])


@router.post("/{agency_id}")
async def request_create(agency_id: str, body: RequestInput, user: User = Depends(agency_user)):
    client_id = user.client if user.role in ("client", "moderator") else body.client
    if not client_id:
        raise ApiError(400, "client is required")
    await require_client(agency_id, client_id, user)
    count = await AdRequest.find({"agency": PydanticObjectId(agency_id)}).count()
    number = f"REQ-{datetime.now(UTC):%Y%m}-{count + 1:04d}"
    item = AdRequest(agency=PydanticObjectId(agency_id), submittedBy=user.id, requestNumber=number, **body.model_dump(exclude={"client"}), client=client_id)
    await item.insert()
    await log(item, user, "created", f"Ad request {number} created")
    return success(await request_dto(item), "Ad request created", 201)


@router.get("/{agency_id}/{request_id}")
async def request_get(agency_id: str, request_id: str, user: User = Depends(agency_user)):
    return success(await request_dto(await scoped_request(agency_id, request_id, user)))


@router.patch("/{agency_id}/{request_id}")
async def request_patch(agency_id: str, request_id: str, body: RequestPatch, user: User = Depends(agency_user)):
    item = await scoped_request(agency_id, request_id, user)
    if user.role in ("client", "moderator") and item.status not in ("Under Review", "Rejected"):
        raise ApiError(403, "Clients and moderators may edit only Under Review or Rejected requests")
    changes = body.model_dump(exclude_unset=True)
    if "client" in changes:
        if user.role in ("client", "moderator"):
            raise ApiError(403, "You cannot reassign this request")
        await require_client(agency_id, changes["client"], user)
    for key, value in changes.items():
        setattr(item, key, value)
    resubmitted = item.status == "Rejected" and user.role in ("client", "moderator")
    if resubmitted:
        item.status, item.rejectionReason, item.agencyNote, item.reviewedBy, item.reviewedAt = "Under Review", "", "", None, None
    await item.save()
    await log(item, user, "resubmitted" if resubmitted else "edited", f"Ad request {item.requestNumber} edited", {"changedFields": list(changes)})
    return success(await request_dto(item), "Ad request updated")


@router.delete("/{agency_id}/{request_id}")
async def request_delete(agency_id: str, request_id: str, user: User = Depends(agency_user)):
    item = await scoped_request(agency_id, request_id, user)
    if user.role in ("client", "moderator", "team") and item.status not in ("Under Review", "Rejected"):
        raise ApiError(403, "This role may delete only Under Review or Rejected requests")
    if await Campaign.find_one({"adRequest": item.id}) or await Invoice.find_one({"adRequest": item.id}) or await ClientUpdate.find_one({"adRequest": item.id}):
        raise ApiError(409, "Ad request has linked records and cannot be deleted")
    await log(item, user, "deleted", f"Ad request {item.requestNumber} deleted")
    await item.delete()
    return success(None, "Ad request deleted")


@router.get("/{agency_id}/{request_id}/activity")
async def request_activity(agency_id: str, request_id: str, user: User = Depends(agency_user)):
    item = await scoped_request(agency_id, request_id, user)
    logs = await ActivityLog.find({"agency": item.agency, "entityType": "ad_request", "entityId": item.id}).sort("-createdAt").to_list()
    return success([await populate(entry, {"actor": User}) for entry in logs])


@router.patch("/{agency_id}/{request_id}/status")
async def request_status(agency_id: str, request_id: str, body: StatusInput, user: User = Depends(roles("admin", "team"))):
    item = await scoped_request(agency_id, request_id, user)
    transitions = {"Under Review": ["Approved", "Rejected"], "Approved": ["Live"], "Live": [], "Rejected": []}
    if body.status not in transitions[item.status]:
        raise ApiError(409, f"Cannot change request status from {item.status} to {body.status}")
    if body.status == "Rejected" and not body.rejectionReason:
        raise ApiError(400, "rejectionReason is required when rejecting a request")
    now = datetime.now(UTC)
    item.status, item.agencyNote, item.rejectionReason = body.status, body.agencyNote, body.rejectionReason if body.status == "Rejected" else ""
    item.reviewedBy, item.reviewedAt = user.id, now
    if body.status == "Approved": item.approvedAt = now
    if body.status == "Live": item.launchedAt = now
    await item.save()
    await log(item, user, "status_changed", f"Request status changed to {body.status}", {"status": body.status})
    return success(await request_dto(item), "Request status updated")
