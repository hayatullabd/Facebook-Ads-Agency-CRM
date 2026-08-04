from datetime import datetime
from typing import Literal

from beanie import PydanticObjectId
from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from app.models.documents import Budget, Performance


class InputModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class RegisterInput(InputModel):
    agencyName: str = Field(min_length=2, max_length=120)
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)


class LoginInput(InputModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)
    agencySlug: str | None = Field(default=None, min_length=2, max_length=120)


class AgencyUpdate(InputModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    logoUrl: str | None = Field(default=None, max_length=2048)
    defaultCurrency: Literal["BDT", "USD", "INR"] | None = None
    defaultRate: float | None = Field(default=None, ge=1)
    onboardingCompleted: bool | None = None


class ClientInput(InputModel):
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


class ClientPatch(ClientInput):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    contactName: str | None = Field(default=None, min_length=1, max_length=100)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=40)
    facebookPageName: str | None = Field(default=None, max_length=150)
    facebookPageId: str | None = None
    adAccountId: str | None = None
    facebookAdAccountIds: list[str] | None = None
    status: Literal["active", "paused", "onboarding"] | None = None
    monthlyBudget: float | None = Field(default=None, ge=0)
    totalSpend: float | None = Field(default=None, ge=0)
    activeCampaigns: int | None = Field(default=None, ge=0)
    walletBalance: float | None = Field(default=None, ge=0)
    currencyRate: float | None = Field(default=None, ge=1)
    billingRate: float | None = Field(default=None, ge=1)
    color: str | None = None
    assignedTeamMembers: list[PydanticObjectId] | None = None
    notes: str | None = Field(default=None, max_length=1000)


class FacebookAccountsInput(InputModel):
    facebookAdAccountIds: list[str] | None = None
    facebookAdAccountId: str | None = Field(default=None, pattern=r"^act_\d+$")
    assigned: bool | None = None

    @model_validator(mode="after")
    def has_account_update(self):
        has_full_list = self.facebookAdAccountIds is not None
        has_single_update = self.facebookAdAccountId is not None and self.assigned is not None
        if not has_full_list and not has_single_update:
            raise ValueError("Provide facebookAdAccountIds or facebookAdAccountId with assigned")
        return self


class RequestInput(InputModel):
    client: PydanticObjectId | None = None
    pageName: str = Field(min_length=1, max_length=150)
    platform: list[Literal["facebook", "instagram", "youtube", "google"]]
    objectiveGroup: Literal["website", "engagement", "message", "others", "page", "awareness", "leads"]
    objective: str = Field(min_length=1, max_length=100)
    budget: Budget
    durationDays: int = Field(ge=1, le=365)
    notes: str = Field(default="", max_length=2000)
    contentLink: str = Field(default="", max_length=2048)


class RequestPatch(InputModel):
    client: PydanticObjectId | None = None
    pageName: str | None = Field(default=None, min_length=1, max_length=150)
    platform: list[Literal["facebook", "instagram", "youtube", "google"]] | None = None
    objectiveGroup: Literal["website", "engagement", "message", "others", "page", "awareness", "leads"] | None = None
    objective: str | None = Field(default=None, min_length=1, max_length=100)
    budget: Budget | None = None
    durationDays: int | None = Field(default=None, ge=1, le=365)
    notes: str | None = Field(default=None, max_length=2000)
    contentLink: str | None = Field(default=None, max_length=2048)


class StatusInput(InputModel):
    status: Literal["Under Review", "Approved", "Live", "Rejected"]
    agencyNote: str = Field(default="", max_length=1000)
    rejectionReason: str = Field(default="", max_length=1000)


class CampaignInput(InputModel):
    client: PydanticObjectId | None = None
    adRequest: PydanticObjectId | None = None
    source: Literal["crm", "facebook"] = "crm"
    name: str = Field(min_length=1, max_length=180)
    platform: Literal["facebook", "instagram", "both"]
    objective: str = ""
    status: Literal["draft", "scheduled", "active", "paused", "completed", "failed"] = "draft"
    budget: Budget = Field(default_factory=Budget)
    startDate: datetime | None = None
    endDate: datetime | None = None
    performance: Performance = Field(default_factory=Performance)


class CampaignPatch(InputModel):
    name: str | None = Field(default=None, min_length=1, max_length=180)
    platform: Literal["facebook", "instagram", "both"] | None = None
    objective: str | None = None
    status: Literal["draft", "scheduled", "active", "paused", "completed", "failed"] | None = None
    budget: Budget | None = None
    startDate: datetime | None = None
    endDate: datetime | None = None
    performance: Performance | None = None


class AssignmentInput(InputModel):
    clientId: PydanticObjectId | None = None
    client: PydanticObjectId | None = None

    @model_validator(mode="after")
    def has_value(self):
        if self.clientId is None and self.client is None and "clientId" not in self.model_fields_set and "client" not in self.model_fields_set:
            raise ValueError("clientId is required")
        return self


class InvoiceInput(InputModel):
    client: PydanticObjectId
    adRequest: PydanticObjectId
    invoiceNumber: str = Field(min_length=1, max_length=100)
    pageName: str
    objective: str
    budget: Budget
    durationDays: int = Field(ge=1)
    rate: float = Field(ge=1)
    amount: float = Field(ge=0)
    currency: Literal["BDT", "USD", "INR"] = "BDT"
    status: Literal["Unpaid", "Paid", "Overdue"] = "Unpaid"
    dueDate: datetime
    notes: str = Field(default="", max_length=1000)


class PaidInput(InputModel):
    paymentMethod: Literal["cash", "bank", "bkash", "nagad", "stripe", "manual"] = "manual"


class TransactionInput(InputModel):
    client: PydanticObjectId
    account: PydanticObjectId | None = None
    type: Literal["Add", "Reduce", "Set"]
    amountUsd: float = Field(ge=0)
    rateBdt: float = Field(ge=0)
    totalBdt: float | None = Field(default=None, ge=0)
    date: datetime | None = None


class UserInput(InputModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    role: Literal["admin", "team", "client", "moderator"] = "client"
    client: PydanticObjectId | None = None
    avatarColor: str = "bg-blue-600"


class UpdateInput(InputModel):
    client: PydanticObjectId
    adRequest: PydanticObjectId
    type: Literal["message", "performance", "billing", "status"] = "message"
    title: str = Field(min_length=1, max_length=150)
    content: str = Field(min_length=1, max_length=3000)


class FacebookCredentialInput(InputModel):
    accessToken: str | None = Field(default=None, min_length=20, max_length=4096)
    defaultAdAccountId: str = ""


class DisconnectInput(InputModel):
    revokeRemote: bool = False
