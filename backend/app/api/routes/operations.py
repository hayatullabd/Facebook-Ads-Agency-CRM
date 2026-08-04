from datetime import UTC, datetime

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends

from app.api.deps import agency_user, client_filter, require_client, roles
from app.core import database
from app.core.responses import ApiError, success
from app.models.documents import AdAccount, AdRequest, Campaign, Client, ClientUpdate, Invoice, ReadReceipt, Transaction, User
from app.schemas.inputs import AssignmentInput, CampaignInput, CampaignPatch, InvoiceInput, PaidInput, TransactionInput, UpdateInput
from app.services.serialization import document_dict, populate

router = APIRouter(tags=["operations"])


async def scoped(model, agency_id: str, item_id: str, user: User):
    try:
        item = await model.find_one({"_id": PydanticObjectId(item_id), "agency": PydanticObjectId(agency_id), **client_filter(user)})
    except ValueError:
        item = None
    if not item:
        raise ApiError(404, f"{model.__name__} not found")
    return item


@router.get("/campaigns/{agency_id}")
async def campaign_list(agency_id: str, user: User = Depends(agency_user)):
    query = {"agency": PydanticObjectId(agency_id)}
    if user.role in ("client", "moderator"):
        client = await Client.get(user.client)
        query["$or"] = [{"client": user.client}, {"facebookAdAccountId": {"$in": client.facebookAdAccountIds if client else []}}]
    return success([await populate(item, {"client": Client}) for item in await Campaign.find(query).sort("-createdAt").to_list()])


@router.post("/campaigns/{agency_id}")
async def campaign_create(agency_id: str, body: CampaignInput, user: User = Depends(roles("admin", "team"))):
    if body.client: await require_client(agency_id, body.client, user)
    item = Campaign(agency=PydanticObjectId(agency_id), **body.model_dump())
    await item.insert()
    return success(await populate(item, {"client": Client}), "Campaign created", 201)


@router.patch("/campaigns/{agency_id}/{campaign_id}")
async def campaign_patch(agency_id: str, campaign_id: str, body: CampaignPatch, user: User = Depends(roles("admin", "team"))):
    item = await scoped(Campaign, agency_id, campaign_id, user)
    for key, value in body.model_dump(exclude_unset=True).items(): setattr(item, key, value)
    await item.save()
    return success(await populate(item, {"client": Client}), "Campaign updated")


@router.patch("/campaigns/{agency_id}/{campaign_id}/client-assignment")
async def campaign_assignment(agency_id: str, campaign_id: str, body: AssignmentInput, user: User = Depends(roles("admin", "team"))):
    item = await scoped(Campaign, agency_id, campaign_id, user)
    item.client = body.clientId if "clientId" in body.model_fields_set else body.client
    if item.client is not None:
        await require_client(agency_id, item.client, user)
    await item.save()
    return success(await populate(item, {"client": Client}), "Campaign assigned")


@router.get("/invoices/{agency_id}")
async def invoice_list(agency_id: str, user: User = Depends(agency_user)):
    query = {"agency": PydanticObjectId(agency_id), **client_filter(user)}
    return success([await populate(item, {"client": Client}) for item in await Invoice.find(query).sort("-createdAt").to_list()])


@router.post("/invoices/{agency_id}")
async def invoice_create(agency_id: str, body: InvoiceInput, user: User = Depends(roles("admin", "team"))):
    await require_client(agency_id, body.client, user)
    request = await AdRequest.find_one({"_id": body.adRequest, "agency": PydanticObjectId(agency_id), "client": body.client})
    if not request: raise ApiError(400, "Ad request does not belong to this client")
    item = Invoice(agency=PydanticObjectId(agency_id), **body.model_dump())
    await item.insert()
    return success(await populate(item, {"client": Client}), "Invoice created", 201)


@router.patch("/invoices/{agency_id}/{invoice_id}/paid")
async def invoice_paid(agency_id: str, invoice_id: str, body: PaidInput, user: User = Depends(roles("admin", "team"))):
    item = await scoped(Invoice, agency_id, invoice_id, user)
    item.status, item.paidAt, item.paymentMethod = "Paid", datetime.now(UTC), body.paymentMethod
    await item.save()
    return success(await populate(item, {"client": Client}), "Invoice marked paid")


@router.get("/transactions/{agency_id}")
async def transaction_list(agency_id: str, user: User = Depends(agency_user)):
    query = {"agency": PydanticObjectId(agency_id), **client_filter(user)}
    return success([await populate(item, {"client": Client, "account": AdAccount}) for item in await Transaction.find(query).sort("-date").to_list()])


@router.post("/transactions/{agency_id}")
async def transaction_create(agency_id: str, body: TransactionInput, user: User = Depends(roles("admin", "team"))):
    client = await require_client(agency_id, body.client, user)
    account = None
    if body.account is not None:
        account = await AdAccount.find_one({"_id": body.account, "agency": client.agency, "client": client.id})
        if not account:
            raise ApiError(400, "Ad account does not belong to this agency client")
    amount = body.amountUsd
    new_balance = amount if body.type == "Set" else client.walletBalance + amount if body.type == "Add" else client.walletBalance - amount
    if new_balance < 0: raise ApiError(409, "Insufficient wallet balance")
    if not database.client: raise ApiError(503, "Database is not ready")
    tx = Transaction(agency=PydanticObjectId(agency_id), client=body.client, account=body.account, type=body.type, amountUsd=amount, rateBdt=body.rateBdt, totalBdt=body.totalBdt if body.totalBdt is not None else amount * body.rateBdt, **({"date": body.date} if body.date else {}))
    async with database.client.start_session() as session:
        async with session.start_transaction():
            result = await Client.get_pymongo_collection().update_one({"_id": client.id, "agency": client.agency, "walletBalance": client.walletBalance}, {"$set": {"walletBalance": new_balance, "updatedAt": datetime.now(UTC)}}, session=session)
            if result.modified_count != 1: raise ApiError(409, "Wallet changed concurrently; retry the transaction")
            await tx.insert(session=session)
    return success(await populate(tx, {"client": Client, "account": AdAccount}), "Transaction created", 201)


@router.get("/updates/{agency_id}")
async def updates_list(agency_id: str, user: User = Depends(agency_user)):
    query = {"agency": PydanticObjectId(agency_id), **client_filter(user)}
    return success([await populate(item, {"client": Client, "adRequest": AdRequest}) for item in await ClientUpdate.find(query).sort("-createdAt").to_list()])


@router.post("/updates/{agency_id}")
async def update_create(agency_id: str, body: UpdateInput, user: User = Depends(roles("admin", "team"))):
    await require_client(agency_id, body.client, user)
    request = await AdRequest.find_one({"_id": body.adRequest, "agency": PydanticObjectId(agency_id), "client": body.client})
    if not request: raise ApiError(400, "Ad request does not belong to this client")
    item = ClientUpdate(agency=PydanticObjectId(agency_id), sentBy=user.id, **body.model_dump())
    await item.insert()
    return success(await populate(item, {"client": Client, "adRequest": AdRequest}), "Update created", 201)


@router.patch("/updates/{agency_id}/{update_id}/read")
async def update_read(agency_id: str, update_id: str, user: User = Depends(agency_user)):
    item = await scoped(ClientUpdate, agency_id, update_id, user)
    if not any(receipt.user == user.id for receipt in item.readBy):
        item.readBy.append(ReadReceipt(user=user.id, readAt=datetime.now(UTC)))
        await item.save()
    return success(document_dict(item), "Update marked read")
