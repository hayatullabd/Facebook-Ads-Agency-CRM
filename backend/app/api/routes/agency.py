from datetime import UTC, datetime, timedelta

from beanie import PydanticObjectId
from celery.exceptions import CeleryError
from fastapi import APIRouter, Depends, Query
from pymongo.errors import DuplicateKeyError

from app.api.deps import agency_user, roles
from app.core.config import get_settings
from app.core.responses import ApiError, success
from app.models.documents import Agency, ApiCredential, Campaign, Client, FacebookSyncJob, Invoice, SyncAccount, User
from app.schemas.inputs import AgencyUpdate, DisconnectInput, FacebookCredentialInput
from app.services.crypto import encrypt_token
from app.services.meta import MetaService
from app.services.serialization import document_dict
from app.workers.tasks import recover_stale_jobs, sync_facebook_job

router = APIRouter(prefix="/agency", tags=["agency-facebook"])


async def agency_or_404(agency_id: str) -> Agency:
    try: agency = await Agency.get(PydanticObjectId(agency_id))
    except ValueError: agency = None
    if not agency: raise ApiError(404, "Agency not found")
    return agency


@router.get("/{agency_id}")
async def agency_get(agency_id: str, user: User = Depends(roles("admin"))):
    return success(document_dict(await agency_or_404(agency_id)))


@router.patch("/{agency_id}")
async def agency_patch(agency_id: str, body: AgencyUpdate, user: User = Depends(roles("admin"))):
    agency = await agency_or_404(agency_id)
    for key, value in body.model_dump(exclude_unset=True).items(): setattr(agency, key, value)
    await agency.save(); return success(document_dict(agency), "Agency updated")


@router.post("/{agency_id}/facebook")
async def facebook_connect(agency_id: str, body: FacebookCredentialInput, user: User = Depends(roles("admin"))):
    existing = await ApiCredential.find_one({"agency": PydanticObjectId(agency_id), "provider": "facebook"})
    if not body.accessToken and not existing: raise ApiError(400, "accessToken is required")
    if body.accessToken:
        meta = MetaService(body.accessToken)
        try: accounts = await meta.accounts()
        finally: await meta.close()
        encrypted = encrypt_token(body.accessToken)
    else:
        accounts, encrypted = [], existing.encryptedAccessToken
    snapshots = [{"accountId": a["id"], "name": a.get("name", ""), "currency": a.get("currency", ""), "accountStatus": a.get("account_status"), "spendCap": a.get("spend_cap")} for a in accounts]
    if existing:
        existing.encryptedAccessToken, existing.defaultAdAccountId = encrypted, body.defaultAdAccountId
        if snapshots: existing.accounts = snapshots
        existing.credentialGeneration += 1; await existing.save(); credential = existing
    else:
        credential = ApiCredential(agency=PydanticObjectId(agency_id), encryptedAccessToken=encrypted, defaultAdAccountId=body.defaultAdAccountId, accounts=snapshots); await credential.insert()
    return success({"connected": True, "defaultAdAccountId": credential.defaultAdAccountId, "accounts": [item.model_dump() for item in credential.accounts]}, "Facebook connected")


@router.delete("/{agency_id}/facebook")
async def facebook_disconnect(agency_id: str, body: DisconnectInput | None = None, user: User = Depends(roles("admin"))):
    credential = await ApiCredential.find_one({"agency": PydanticObjectId(agency_id), "provider": "facebook"})
    if credential: await credential.delete()
    return success({"disconnected": True, "remoteRevoked": False}, "Facebook disconnected")


async def facebook_scope(user: User) -> tuple[list[str] | None, PydanticObjectId | None]:
    if user.role not in ("client", "moderator"):
        return None, None
    if not user.client:
        raise ApiError(403, "User is not linked to a client")
    client = await Client.find_one({"_id": user.client, "agency": user.agency})
    if not client:
        raise ApiError(403, "Linked client was not found")
    return client.facebookAdAccountIds, client.id


def account_dto(item) -> dict:
    return {
        "facebookAdAccountId": item.accountId,
        "accountId": item.accountId.removeprefix("act_"),
        "name": item.name,
        "accountStatus": item.accountStatus,
        "currency": item.currency,
        "timezoneName": item.timezoneName,
        "lastSeenAt": item.lastSeenAt.isoformat() if item.lastSeenAt else None,
        "isAccessible": item.isAccessible,
    }


@router.get("/{agency_id}/facebook-accounts")
async def facebook_accounts(agency_id: str, user: User = Depends(agency_user)):
    credential = await ApiCredential.find_one({"agency": PydanticObjectId(agency_id), "provider": "facebook"})
    account_ids, _ = await facebook_scope(user)
    accounts = credential.accounts if credential else []
    if account_ids is not None:
        allowed = set(account_ids)
        accounts = [item for item in accounts if item.accountId in allowed]
    return success([account_dto(item) for item in accounts])


@router.get("/{agency_id}/facebook-overview")
async def facebook_overview(agency_id: str, user: User = Depends(agency_user)):
    agency_oid = PydanticObjectId(agency_id)
    agency = await agency_or_404(agency_id)
    credential = await ApiCredential.find_one({"agency": agency_oid, "provider": "facebook"})
    account_ids, client_id = await facebook_scope(user)
    campaign_query = {"agency": agency_oid, "source": "facebook", "isStale": False}
    invoice_query = {"agency": agency_oid}
    if account_ids is not None:
        campaign_query["facebookAdAccountId"] = {"$in": account_ids}
        invoice_query["client"] = client_id
    campaigns = await Campaign.find(campaign_query).sort("-lastSeenAt").to_list()
    invoices = await Invoice.find(invoice_query).to_list()
    accounts = credential.accounts if credential else []
    if account_ids is not None:
        allowed = set(account_ids)
        accounts = [item for item in accounts if item.accountId in allowed]
    latest_job = await FacebookSyncJob.find_one({"agency": agency_oid, "status": {"$in": ["success", "partial", "failed"]}}, sort=[("createdAt", -1)])
    spend = sum(item.performance.spend for item in campaigns)
    impressions = sum(item.performance.impressions for item in campaigns)
    results = sum(item.performance.results for item in campaigns)
    billed = sum(item.amount for item in invoices)
    unpaid = sum(item.amount for item in invoices if item.status != "Paid")
    due_soon = sum(1 for item in invoices if item.status != "Paid" and item.dueDate <= datetime.now(UTC) + timedelta(days=7))
    last_sync = credential.lastSyncedAt if credential else None
    return success({
        "agency": {"id": str(agency.id), "name": agency.name, "currency": agency.defaultCurrency},
        "connection": {
            "status": "connected" if credential else "not-connected", "isConnected": bool(credential),
            "adAccountId": credential.defaultAdAccountId if credential and (account_ids is None or credential.defaultAdAccountId in account_ids) else "",
            "accountCount": len(accounts), "accounts": [account_dto(item) for item in accounts], "tokenConfigured": bool(credential),
            "lastVerifiedAt": credential.updatedAt.isoformat() if credential else None, "lastSyncAt": last_sync.isoformat() if last_sync else None,
            "lastAccountSyncAt": last_sync.isoformat() if last_sync else None, "lastSyncStatus": latest_job.status if latest_job else "never",
            "graphApiReady": bool(credential), "graphApi": None,
        },
        "overview": {"spend": spend, "impressions": impressions, "results": results, "activeCampaigns": sum(1 for item in campaigns if item.status == "active"), "campaignCount": len(campaigns), "billedAmount": billed, "unpaidAmount": unpaid, "dueSoonCount": due_soon, "usage": {"callsUsed": 0, "callsLimit": 0, "resetAt": None}, "currency": agency.defaultCurrency, "cpa": spend / results if results else 0},
        "recentCampaigns": [{"id": str(item.id), "name": item.name, "status": item.status, "spend": item.performance.spend, "impressions": item.performance.impressions, "results": item.performance.results, "costPerResult": item.performance.costPerResult} for item in campaigns[:5]],
        "billing": {"billedAmount": billed, "unpaidAmount": unpaid, "dueSoonCount": due_soon, "currency": agency.defaultCurrency, "paidRatio": (billed - unpaid) / billed if billed else 0},
        "source": "facebook", "updatedAt": datetime.now(UTC).isoformat(),
    })


async def enqueue(agency_id: str, user: User, kind="full", parent=None, accounts=None):
    settings = get_settings()
    if not settings.redis_url: raise ApiError(503, "Redis is not configured; Facebook sync is unavailable")
    agency_oid = PydanticObjectId(agency_id)
    credential = await ApiCredential.find_one({"agency": agency_oid, "provider": "facebook"})
    if not credential: raise ApiError(409, "Facebook is not connected")
    await recover_stale_jobs(agency_oid)
    job = FacebookSyncJob(agency=PydanticObjectId(agency_id), kind=kind, parent=parent, requestedBy=user.id, lockKey=f"facebook:{agency_id}", credentialGeneration=credential.credentialGeneration, accounts=accounts or [])
    try: await job.insert()
    except DuplicateKeyError:
        active = await FacebookSyncJob.find_one({"agency": PydanticObjectId(agency_id), "status": {"$in": ["queued", "running"]}})
        raise ApiError(409, f"A Facebook sync job is already active: {active.id}") from None
    try: sync_facebook_job.delay(str(job.id))
    except (CeleryError, OSError):
        await job.delete(); raise ApiError(503, "Facebook sync queue is unavailable") from None
    return success(document_dict(job), "Facebook sync queued", 202)


@router.post("/{agency_id}/facebook-sync")
@router.post("/{agency_id}/facebook-sync-jobs")
async def sync_create(agency_id: str, user: User = Depends(roles("admin"))): return await enqueue(agency_id, user)


@router.get("/{agency_id}/facebook-sync-jobs/active")
async def sync_active(agency_id: str, user: User = Depends(roles("admin"))):
    job = await FacebookSyncJob.find_one({"agency": PydanticObjectId(agency_id), "status": {"$in": ["queued", "running"]}})
    return success(document_dict(job) if job else None)


@router.get("/{agency_id}/facebook-sync-jobs")
async def sync_history(agency_id: str, limit: int = Query(10, ge=1, le=100), user: User = Depends(roles("admin"))):
    jobs = await FacebookSyncJob.find({"agency": PydanticObjectId(agency_id)}).sort("-createdAt").limit(limit).to_list()
    return success([document_dict(job) for job in jobs])


@router.get("/{agency_id}/facebook-sync-jobs/{job_id}")
async def sync_detail(agency_id: str, job_id: str, user: User = Depends(roles("admin"))):
    job = await FacebookSyncJob.find_one({"_id": PydanticObjectId(job_id), "agency": PydanticObjectId(agency_id)})
    if not job: raise ApiError(404, "Facebook sync job not found")
    return success(document_dict(job))


@router.post("/{agency_id}/facebook-sync-jobs/{job_id}/accounts/{account_id}/retry")
async def sync_retry(agency_id: str, job_id: str, account_id: str, user: User = Depends(roles("admin"))):
    parent = await FacebookSyncJob.find_one({"_id": PydanticObjectId(job_id), "agency": PydanticObjectId(agency_id)})
    account = next((item for item in parent.accounts if item.accountId == account_id and item.status == "failed"), None) if parent else None
    if not account: raise ApiError(404, "Failed account was not found in this job")
    return await enqueue(agency_id, user, "retry", parent.id, [SyncAccount(accountId=account.accountId, name=account.name, currency=account.currency)])
