from datetime import UTC, datetime
from typing import Any, Literal

from beanie import Document, PydanticObjectId
from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl, field_validator
from pymongo import ASCENDING, DESCENDING, IndexModel


def now_utc() -> datetime:
    return datetime.now(UTC)


class CRMDocument(Document):
    createdAt: datetime = Field(default_factory=now_utc)
    updatedAt: datetime = Field(default_factory=now_utc)

    async def save(self, *args, **kwargs):
        self.updatedAt = now_utc()
        return await super().save(*args, **kwargs)


class Agency(CRMDocument):
    name: str = Field(min_length=2, max_length=120)
    slug: str = Field(min_length=2, max_length=120, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    logoUrl: str = ""
    defaultCurrency: Literal["BDT", "USD", "INR"] = "BDT"
    defaultRate: float = Field(default=110, ge=1)
    onboardingCompleted: bool = False
    owner: PydanticObjectId

    class Settings:
        name = "agencies"
        indexes = [IndexModel("slug", unique=True)]


class User(CRMDocument):
    agency: PydanticObjectId
    client: PydanticObjectId | None = None
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    passwordHash: str
    role: Literal["admin", "team", "client", "moderator"] = "client"
    avatarColor: str = "bg-blue-600"
    isActive: bool = True
    lastLoginAt: datetime | None = None

    class Settings:
        name = "users"
        indexes = [
            IndexModel([("agency", ASCENDING), ("email", ASCENDING)], unique=True),
            IndexModel("email"),
        ]


class Client(CRMDocument):
    agency: PydanticObjectId
    name: str = Field(min_length=1, max_length=120)
    contactName: str = Field(min_length=1, max_length=100)
    email: EmailStr
    phone: str = Field(default="", max_length=40)
    facebookPageName: str = Field(default="", max_length=150)
    facebookPageId: str = ""
    adAccountId: str = ""
    facebookAdAccountIds: list[str] = Field(default_factory=list)
    status: Literal["active", "paused", "onboarding"] = "onboarding"
    monthlyBudget: float = Field(default=0, ge=0)
    totalSpend: float = Field(default=0, ge=0)
    activeCampaigns: int = Field(default=0, ge=0)
    walletBalance: float = Field(default=0, ge=0)
    currencyRate: float = Field(default=110, ge=1)
    billingRate: float = Field(default=110, ge=1)
    color: str = "bg-blue-600"
    assignedTeamMembers: list[PydanticObjectId] = Field(default_factory=list)
    notes: str = Field(default="", max_length=1000)

    @field_validator("facebookAdAccountIds")
    @classmethod
    def validate_accounts(cls, values):
        normalized = list(dict.fromkeys(values))
        if any(not value.startswith("act_") or not value[4:].isdigit() for value in normalized):
            raise ValueError("Facebook account IDs must use act_123 format")
        return normalized

    class Settings:
        name = "clients"
        indexes = [
            IndexModel([("agency", ASCENDING), ("email", ASCENDING)], unique=True),
            IndexModel([("agency", ASCENDING), ("facebookAdAccountIds", ASCENDING)]),
        ]


class AdAccount(CRMDocument):
    agency: PydanticObjectId
    client: PydanticObjectId | None = None
    facebookAdAccountId: str
    name: str = ""
    currency: str = "USD"
    accountStatus: int | None = None
    spendCap: float | None = None
    amountSpent: float = 0
    lastSyncedAt: datetime | None = None

    class Settings:
        name = "ad_accounts"
        indexes = [IndexModel([("agency", ASCENDING), ("facebookAdAccountId", ASCENDING)], unique=True)]


class Budget(BaseModel):
    amount: float | None = Field(default=None, ge=0)
    type: Literal["daily", "lifetime"] | None = None
    currency: Literal["USD", "BDT", "INR"] = "USD"


class AdRequest(CRMDocument):
    agency: PydanticObjectId
    client: PydanticObjectId
    requestNumber: str
    pageName: str = Field(min_length=1, max_length=150)
    platform: list[Literal["facebook", "instagram", "youtube", "google"]]
    objectiveGroup: Literal["website", "engagement", "message", "others", "page", "awareness", "leads"]
    objective: str = Field(min_length=1, max_length=100)
    budget: Budget
    durationDays: int = Field(ge=1, le=365)
    notes: str = Field(default="", max_length=2000)
    contentLink: str = Field(default="", max_length=2048)
    status: Literal["Under Review", "Approved", "Live", "Rejected"] = "Under Review"
    agencyNote: str = Field(default="", max_length=1000)
    rejectionReason: str = Field(default="", max_length=1000)
    submittedBy: PydanticObjectId
    reviewedBy: PydanticObjectId | None = None
    reviewedAt: datetime | None = None
    approvedAt: datetime | None = None
    launchedAt: datetime | None = None

    @field_validator("platform", mode="before")
    @classmethod
    def normalize_platform(cls, value):
        values = value if isinstance(value, list) else [value]
        values = ["facebook", "instagram"] if values == ["both"] else values
        return list(dict.fromkeys(values))

    @field_validator("contentLink")
    @classmethod
    def validate_content_link(cls, value):
        if value and not value.startswith(("http://", "https://")):
            raise ValueError("Content link must be an absolute HTTP or HTTPS URL")
        return value

    class Settings:
        name = "ad_requests"
        indexes = [
            IndexModel([("agency", ASCENDING), ("requestNumber", ASCENDING)], unique=True),
            IndexModel([("agency", ASCENDING), ("status", ASCENDING), ("createdAt", DESCENDING)]),
        ]


class Performance(BaseModel):
    spend: float = Field(default=0, ge=0)
    reach: int = Field(default=0, ge=0)
    impressions: int = Field(default=0, ge=0)
    results: float = Field(default=0, ge=0)
    resultMetric: str = ""
    costPerResult: float = Field(default=0, ge=0)
    lastSyncedAt: datetime | None = None


class Campaign(CRMDocument):
    agency: PydanticObjectId
    client: PydanticObjectId | None = None
    adRequest: PydanticObjectId | None = None
    source: Literal["crm", "facebook"] = "crm"
    facebookCampaignId: str = ""
    facebookAdAccountId: str = ""
    facebookAdAccountName: str = ""
    facebookStatus: str = ""
    effectiveStatus: str = ""
    facebookObjective: str = ""
    lastSeenAt: datetime | None = None
    syncRunId: str = ""
    isStale: bool = False
    name: str = Field(min_length=1, max_length=180)
    platform: Literal["facebook", "instagram", "both"]
    objective: str = ""
    status: Literal["draft", "scheduled", "active", "paused", "completed", "failed"] = "draft"
    budget: Budget = Field(default_factory=Budget)
    startDate: datetime | None = None
    endDate: datetime | None = None
    performance: Performance = Field(default_factory=Performance)

    class Settings:
        name = "campaigns"
        indexes = [
            IndexModel([("agency", ASCENDING), ("client", ASCENDING)]),
            IndexModel([("agency", ASCENDING), ("facebookAdAccountId", ASCENDING), ("facebookCampaignId", ASCENDING)], unique=True, partialFilterExpression={"source": "facebook"}),
            IndexModel("adRequest", unique=True, partialFilterExpression={"adRequest": {"$type": "objectId"}}),
        ]


class Invoice(CRMDocument):
    agency: PydanticObjectId
    client: PydanticObjectId
    adRequest: PydanticObjectId
    invoiceNumber: str
    pageName: str
    objective: str
    budget: Budget
    durationDays: int = Field(ge=1)
    rate: float = Field(ge=1)
    amount: float = Field(ge=0)
    currency: Literal["BDT", "USD", "INR"] = "BDT"
    status: Literal["Unpaid", "Paid", "Overdue"] = "Unpaid"
    dueDate: datetime
    paidAt: datetime | None = None
    paymentMethod: Literal["cash", "bank", "bkash", "nagad", "stripe", "manual", ""] = ""
    notes: str = Field(default="", max_length=1000)

    class Settings:
        name = "invoices"
        indexes = [IndexModel([("agency", ASCENDING), ("invoiceNumber", ASCENDING)], unique=True)]


class Transaction(CRMDocument):
    agency: PydanticObjectId
    client: PydanticObjectId
    account: PydanticObjectId | None = None
    type: Literal["Add", "Reduce", "Set"]
    amountUsd: float = Field(ge=0)
    rateBdt: float = Field(ge=0)
    totalBdt: float = Field(ge=0)
    date: datetime = Field(default_factory=now_utc)

    class Settings:
        name = "transactions"
        indexes = [IndexModel([("agency", ASCENDING), ("client", ASCENDING), ("date", DESCENDING)])]


class ReadReceipt(BaseModel):
    user: PydanticObjectId
    readAt: datetime = Field(default_factory=now_utc)


class ClientUpdate(CRMDocument):
    agency: PydanticObjectId
    client: PydanticObjectId
    adRequest: PydanticObjectId
    type: Literal["message", "performance", "billing", "status"] = "message"
    title: str = Field(min_length=1, max_length=150)
    content: str = Field(min_length=1, max_length=3000)
    sentBy: PydanticObjectId
    readBy: list[ReadReceipt] = Field(default_factory=list)

    class Settings:
        name = "client_updates"
        indexes = [IndexModel([("agency", ASCENDING), ("client", ASCENDING), ("createdAt", DESCENDING)])]


class ActivityLog(CRMDocument):
    agency: PydanticObjectId
    actor: PydanticObjectId
    client: PydanticObjectId | None = None
    adRequest: PydanticObjectId | None = None
    entityType: str
    entityId: PydanticObjectId
    action: str
    detail: str
    metadata: dict[str, Any] = Field(default_factory=dict)

    class Settings:
        name = "activity_logs"
        indexes = [IndexModel([("agency", ASCENDING), ("createdAt", DESCENDING)])]


class AccountSnapshot(BaseModel):
    accountId: str
    name: str = ""
    currency: str = ""
    timezoneName: str = ""
    accountStatus: int | None = None
    spendCap: float | None = None
    lastSeenAt: datetime | None = None
    isAccessible: bool = True


class ApiCredential(CRMDocument):
    agency: PydanticObjectId
    provider: Literal["facebook"] = "facebook"
    encryptedAccessToken: str
    defaultAdAccountId: str = ""
    accounts: list[AccountSnapshot] = Field(default_factory=list)
    credentialGeneration: int = 1
    connectedAt: datetime = Field(default_factory=now_utc)
    lastSyncedAt: datetime | None = None

    class Settings:
        name = "api_credentials"
        indexes = [IndexModel([("agency", ASCENDING), ("provider", ASCENDING)], unique=True)]


class SyncError(BaseModel):
    message: str = Field(max_length=300)
    category: str = Field(default="request", max_length=50)
    retryable: bool = False


class SyncAccount(BaseModel):
    accountId: str
    name: str = ""
    currency: str = ""
    status: Literal["pending", "running", "success", "failed"] = "pending"
    campaignCount: int | None = None
    insightCount: int | None = None
    matchedCount: int = 0
    modifiedCount: int = 0
    upsertedCount: int = 0
    staleCount: int = 0
    error: SyncError | None = None
    startedAt: datetime | None = None
    completedAt: datetime | None = None


class SyncProgress(BaseModel):
    total: int = 0
    completed: int = 0
    succeeded: int = 0
    failed: int = 0
    percent: int = 0


class FacebookSyncJob(CRMDocument):
    agency: PydanticObjectId
    provider: Literal["facebook"] = "facebook"
    kind: Literal["full", "retry"]
    parent: PydanticObjectId | None = None
    requestedBy: PydanticObjectId
    lockKey: str
    status: Literal["queued", "running", "success", "partial", "failed"] = "queued"
    stage: Literal["queued", "discovery", "accounts", "complete"] = "queued"
    credentialGeneration: int = 0
    startedAt: datetime | None = None
    completedAt: datetime | None = None
    expiresAt: datetime | None = None
    error: SyncError | None = None
    progress: SyncProgress = Field(default_factory=SyncProgress)
    accounts: list[SyncAccount] = Field(default_factory=list)

    class Settings:
        name = "facebook_sync_jobs"
        indexes = [
            IndexModel([("agency", ASCENDING), ("lockKey", ASCENDING)], unique=True, partialFilterExpression={"status": {"$in": ["queued", "running"]}}),
            IndexModel([("agency", ASCENDING), ("createdAt", DESCENDING)]),
            IndexModel("expiresAt", expireAfterSeconds=0),
        ]


DOCUMENT_MODELS = [Agency, User, Client, AdAccount, AdRequest, ActivityLog, Campaign, Invoice, Transaction, ClientUpdate, ApiCredential, FacebookSyncJob]
