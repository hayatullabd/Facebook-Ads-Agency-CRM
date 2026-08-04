from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, Query

from app.api.deps import agency_user, client_filter
from app.core.responses import success
from app.models.documents import ActivityLog, AdRequest, Campaign, Client, Invoice, User
from app.services.serialization import populate

router = APIRouter(tags=["dashboard-logs"])


@router.get("/logs/{agency_id}")
async def logs(agency_id: str, limit: int = Query(100, ge=1, le=500), user: User = Depends(agency_user)):
    query = {"agency": PydanticObjectId(agency_id), **client_filter(user)}
    items = await ActivityLog.find(query).sort("-createdAt").limit(limit).to_list()
    return success([await populate(item, {"actor": User, "client": Client}) for item in items])


@router.get("/dashboard/{agency_id}")
async def dashboard(agency_id: str, user: User = Depends(agency_user)):
    agency = PydanticObjectId(agency_id)
    scope = client_filter(user)
    clients = await Client.find({"agency": agency, **({"_id": user.client} if scope else {})}).to_list()
    campaigns = await Campaign.find({"agency": agency, **scope}).to_list()
    requests = await AdRequest.find({"agency": agency, **scope}).to_list()
    invoices = await Invoice.find({"agency": agency, **scope}).to_list()
    data = {
        "stats": {"totalClients": len(clients), "activeCampaigns": sum(1 for item in campaigns if item.status == "active"), "pendingRequests": sum(1 for item in requests if item.status == "Under Review"), "unpaidInvoices": sum(1 for item in invoices if item.status != "Paid"), "totalSpend": sum(item.performance.spend for item in campaigns)},
        "recentRequests": [await populate(item, {"client": Client}) for item in sorted(requests, key=lambda value: value.createdAt, reverse=True)[:5]],
        "campaignPerformance": [{"name": item.name, **item.performance.model_dump()} for item in campaigns[:10]],
    }
    return success(data)
