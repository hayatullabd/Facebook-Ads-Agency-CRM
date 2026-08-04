import asyncio
from datetime import UTC, datetime, timedelta

from beanie import PydanticObjectId, init_beanie
from pymongo import AsyncMongoClient

from app.core.config import get_settings
from app.models.documents import ApiCredential, Campaign, DOCUMENT_MODELS, FacebookSyncJob, Performance, SyncAccount, SyncError
from app.services.crypto import decrypt_token
from app.services.meta import MetaPaginationIncomplete, MetaService
from app.workers.celery_app import celery_app


async def _db():
    settings = get_settings()
    client = AsyncMongoClient(settings.mongodb_uri)
    await init_beanie(client[settings.mongodb_database], document_models=DOCUMENT_MODELS)
    return client


def _snapshot(account: dict) -> dict:
    return {
        "accountId": account["id"], "name": account.get("name", ""), "currency": account.get("currency", ""),
        "timezoneName": account.get("timezone_name", ""), "accountStatus": account.get("account_status"),
        "spendCap": account.get("spend_cap"), "lastSeenAt": datetime.now(UTC), "isAccessible": True,
    }


async def _sync(job_id: str):
    client = None
    meta = None
    job = None
    try:
        client = await _db()
        job = await FacebookSyncJob.get(PydanticObjectId(job_id))
        if not job:
            return
        job.status, job.stage, job.startedAt = "running", "discovery", datetime.now(UTC)
        await job.save()
        credential = await ApiCredential.find_one({"agency": job.agency, "provider": "facebook"})
        if not credential:
            raise RuntimeError("Facebook is not connected")
        meta = MetaService(decrypt_token(credential.encryptedAccessToken))
        discovered = await meta.accounts()
        retry_ids = {account.accountId for account in job.accounts} if job.kind == "retry" else None
        accounts = [item for item in discovered if retry_ids is None or item["id"] in retry_ids]
        job.accounts = [SyncAccount(accountId=item["id"], name=item.get("name", ""), currency=item.get("currency", "")) for item in accounts]
        job.progress.total, job.stage = len(accounts), "accounts"
        await job.save()
        for account in job.accounts:
            account.status, account.startedAt = "running", datetime.now(UTC)
            await job.save()
            try:
                campaigns, insights = await asyncio.gather(meta.campaigns(account.accountId), meta.insights(account.accountId))
                insight_map = {row.get("campaign_id"): row for row in insights}
                seen = []
                for raw in campaigns:
                    campaign_id, metric = raw["id"], insight_map.get(raw["id"], {})
                    seen.append(campaign_id)
                    existing = await Campaign.find_one({"agency": job.agency, "facebookAdAccountId": account.accountId, "facebookCampaignId": campaign_id})
                    values = dict(name=raw.get("name", campaign_id), source="facebook", facebookStatus=raw.get("status", ""), effectiveStatus=raw.get("effective_status", ""), facebookObjective=raw.get("objective", ""), objective=raw.get("objective", ""), status="active" if raw.get("effective_status") == "ACTIVE" else "paused", lastSeenAt=datetime.now(UTC), isStale=False, performance=Performance(**{key: metric.get(key, 0) for key in ("spend", "reach", "impressions", "results", "costPerResult")}, resultMetric=metric.get("resultMetric", ""), lastSyncedAt=datetime.now(UTC)))
                    if existing:
                        for key, value in values.items():
                            setattr(existing, key, value)
                        await existing.save()
                        account.modifiedCount += 1
                    else:
                        await Campaign(agency=job.agency, facebookCampaignId=campaign_id, facebookAdAccountId=account.accountId, facebookAdAccountName=account.name, platform="facebook", **values).insert()
                        account.upsertedCount += 1
                stale = await Campaign.find({"agency": job.agency, "facebookAdAccountId": account.accountId, "facebookCampaignId": {"$nin": seen}, "source": "facebook"}).update_many({"$set": {"isStale": True}})
                account.staleCount, account.campaignCount, account.insightCount, account.status = stale.modified_count, len(campaigns), len(insights), "success"
                job.progress.succeeded += 1
            except MetaPaginationIncomplete:
                account.status, account.error = "failed", SyncError(message="Facebook returned an incomplete paginated result; retry this account", category="pagination", retryable=True)
                job.progress.failed += 1
            except Exception:
                account.status, account.error = "failed", SyncError(message="Account sync failed", retryable=True)
                job.progress.failed += 1
            account.completedAt = datetime.now(UTC)
            job.progress.completed += 1
            job.progress.percent = round(job.progress.completed * 100 / max(job.progress.total, 1))
            await job.save()
        job.status = "partial" if job.progress.failed and job.progress.succeeded else "failed" if job.progress.failed else "success"
        job.stage, job.completedAt, job.expiresAt = "complete", datetime.now(UTC), datetime.now(UTC) + timedelta(days=get_settings().sync_retention_days)
        credential.lastSyncedAt = datetime.now(UTC)
        credential.accounts = [_snapshot(account) for account in discovered]
        await credential.save()
        await job.save()
    except Exception:
        if job:
            job.status, job.stage = "failed", "complete"
            job.completedAt = datetime.now(UTC)
            job.expiresAt = job.completedAt + timedelta(days=get_settings().sync_retention_days)
            job.error = SyncError(message="Facebook sync failed", category="internal", retryable=True)
            await job.save()
        raise
    finally:
        if meta:
            await meta.close()
        if client:
            await client.close()


@celery_app.task(name="app.workers.tasks.sync_facebook_job", autoretry_for=(OSError,), retry_backoff=True, retry_jitter=True, max_retries=3)
def sync_facebook_job(job_id: str):
    asyncio.run(_sync(job_id))


async def recover_stale_jobs(agency: PydanticObjectId | None = None):
    cutoff = datetime.now(UTC) - timedelta(hours=1)
    query = {"status": {"$in": ["queued", "running"]}, "updatedAt": {"$lt": cutoff}}
    if agency is not None:
        query["agency"] = agency
    completed = datetime.now(UTC)
    await FacebookSyncJob.find(query).update_many({"$set": {"status": "failed", "stage": "complete", "completedAt": completed, "expiresAt": completed + timedelta(days=get_settings().sync_retention_days), "error": {"message": "Sync job expired before completion", "category": "stale", "retryable": True}, "updatedAt": completed}})


async def _enqueue_all():
    client = await _db()
    try:
        await recover_stale_jobs()
        for credential in await ApiCredential.find({"provider": "facebook"}).to_list():
            active = await FacebookSyncJob.find_one({"agency": credential.agency, "status": {"$in": ["queued", "running"]}})
            if not active:
                owner = await __import__("app.models.documents", fromlist=["Agency"]).Agency.get(credential.agency)
                job = FacebookSyncJob(agency=credential.agency, kind="full", requestedBy=owner.owner, lockKey=f"facebook:{credential.agency}", credentialGeneration=credential.credentialGeneration)
                await job.insert()
                sync_facebook_job.delay(str(job.id))
    finally:
        await client.close()


@celery_app.task(name="app.workers.tasks.enqueue_connected_agencies")
def enqueue_connected_agencies():
    asyncio.run(_enqueue_all())
