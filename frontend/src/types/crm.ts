export type Screen = "dashboard" | "requests" | "clients" | "campaigns" | "billing" | "settings" | "updates" | "users";
export type Role = "client" | "team" | "admin" | "moderator";
export type AdPlatform = "facebook" | "instagram" | "both";
export type AdRequestPlatform = "facebook" | "instagram" | "youtube" | "google";
export type RequestStatus = "Under Review" | "Approved" | "Live" | "Rejected";
export type InvoiceStatus = "Unpaid" | "Paid" | "Overdue";

export interface AgencyProfile {
  _id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  defaultCurrency: "BDT" | "USD" | "INR";
  defaultRate: number;
}
export interface FacebookAdAccount {
  facebookAdAccountId: string;
  accountId: string;
  name: string;
  accountStatus?: number | null;
  currency?: string;
  timezoneName?: string;
  lastSeenAt?: string;
  isAccessible: boolean;
}
export type FacebookSyncJobStatus = "queued" | "running" | "success" | "partial" | "failed";
export type FacebookSyncJobStage = "queued" | "discovery" | "accounts" | "complete";
export interface FacebookSyncError { message: string; category: string; retryable: boolean }
export interface FacebookSyncAccountDiagnostic {
  accountId: string; name: string; currency?: string; status: "pending" | "running" | "success" | "failed";
  campaignCount: number | null; insightCount: number | null; matchedCount: number; modifiedCount: number;
  upsertedCount: number; staleCount: number; error: FacebookSyncError | null; startedAt?: string | null; completedAt?: string | null;
}
export interface FacebookSyncJob {
  id: string; agency: string; provider: "facebook"; kind: "full" | "retry"; parent: string | null;
  status: FacebookSyncJobStatus; stage: FacebookSyncJobStage;
  progress: { total: number; completed: number; succeeded: number; failed: number; percent: number };
  accounts: FacebookSyncAccountDiagnostic[]; error: FacebookSyncError | null; requestedBy: string;
  createdAt: string; startedAt: string | null; completedAt: string | null; updatedAt: string;
}
export interface FacebookSyncResult {
  synced: boolean;
  mode: string;
  message: string;
  accounts: Array<{ account: string; accountName?: string; campaignCount: number; status: "success" | "failed"; error?: string }>;
  overview: FacebookOverview;
}
export interface FacebookOverview {
  agency: {
    id: string;
    name: string;
    currency: string;
  };
  connection: {
    status: "connected" | "demo" | "not-connected";
    isConnected: boolean;
    adAccountId: string;
    accountCount: number;
    accounts: FacebookAdAccount[];
    tokenConfigured: boolean;
    lastVerifiedAt: string | null;
    lastSyncAt: string | null;
    lastAccountSyncAt: string | null;
    lastSyncStatus: "never" | "success" | "partial" | "failed";
    graphApiReady: boolean;
    graphApi: {
      baseUrl: string;
      adAccountId: string;
      insightsEndpoint: string;
    } | null;
  };
  overview: {
    spend: number;
    impressions: number;
    results: number;
    activeCampaigns: number;
    campaignCount: number;
    billedAmount: number;
    unpaidAmount: number;
    dueSoonCount: number;
    usage: {
      callsUsed: number;
      callsLimit: number;
      resetAt: string | null;
    };
    currency: string;
    cpa: number;
  };
  recentCampaigns: Array<{
    id: string;
    name: string;
    status: string;
    spend: number;
    impressions: number;
    results: number;
    costPerResult: number;
  }>;
  billing: {
    billedAmount: number;
    unpaidAmount: number;
    dueSoonCount: number;
    currency: string;
    paidRatio: number;
  };
  source: string;
  updatedAt: string;
}

export interface Client {
  _id: string;
  name: string;
  contactName: string;
  email: string;
  facebookPageName: string;
  adAccountId: string;
  status: "active" | "paused" | "onboarding";
  monthlyBudget: number;
  totalSpend: number;
  activeCampaigns: number;
  billingRate: number;
  color: string;
  facebookAdAccountIds?: string[];
}

export interface UserAccount {
  _id: string;
  agency: string;
  client?: Client | string | null;
  name: string;
  email: string;
  role: Role;
  avatarColor: string;
  isActive: boolean;
  createdAt: string;
}

export interface AdRequest {
  _id: string;
  requestNumber: string;
  client?: Client;
  pageName: string;
  platform: AdRequestPlatform | "both" | AdRequestPlatform[];
  objectiveGroup: string;
  objective: string;
  budget: { amount: number; type: "daily" | "lifetime"; currency: string };
  durationDays: number;
  notes: string;
  contentLink?: string;
  status: RequestStatus;
  agencyNote?: string;
  rejectionReason?: string;
  submittedBy?: Pick<UserAccount, "_id" | "name">;
  reviewedBy?: Pick<UserAccount, "_id" | "name"> | null;
  reviewedAt?: string | null;
  approvedAt?: string | null;
  launchedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  _id: string;
  actor?: Pick<UserAccount, "_id" | "name">;
  action: string;
  detail: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface Campaign {
  _id: string;
  name: string;
  client?: Client | null;
  source: "crm" | "facebook";
  facebookCampaignId?: string;
  facebookAdAccountId?: string;
  facebookAdAccountName?: string;
  facebookStatus?: string;
  effectiveStatus?: string;
  facebookObjective?: string;
  isStale?: boolean;
  lastSeenAt?: string;
  platform: AdPlatform;
  objective: string;
  status: "draft" | "scheduled" | "active" | "paused" | "completed" | "failed";
  budget: { amount: number | null; type: "daily" | "lifetime" | null; currency: string };
  performance: { spend: number; reach: number; impressions: number; results: number; resultMetric?: string; costPerResult: number };
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  client?: Client;
  pageName: string;
  objective: string;
  budget: { amount: number; type: "daily" | "lifetime"; currency: string };
  durationDays: number;
  rate: number;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  dueDate: string;
  createdAt: string;
}

export interface ClientUpdate {
  _id: string;
  client?: Client;
  adRequest?: AdRequest;
  type: "message" | "performance" | "billing" | "status";
  title: string;
  content: string;
  createdAt: string;
}
