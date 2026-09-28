import { apiRequest } from "../../lib/api";
import type { Campaign, Client, FacebookAdAccount } from "../../types/crm";

export type CampaignRangeInsight = {
  _id?: string;
  facebookCampaignId: string;
  name?: string;
  liveOnly?: boolean;
  facebookAdAccountId?: string;
  facebookAdAccountName?: string;
  objective?: string;
  facebookObjective?: string;
  status?: Campaign["status"];
  effectiveStatus?: string;
  budget?: Campaign["budget"];
  startDate?: string | null;
  endDate?: string | null;
  performance: {
    actions: Array<{ actionType: string; value: number }>;
    results: number;
    resultMetric: string;
    landingPageViews: number;
    spend: number;
    amountSpent: number;
    costPerResult: number;
    ctrAll: number;
    reach: number;
    impressions: number;
    currency: "USD";
    delivery: string;
    since: string;
    until: string;
  };
};
export type CampaignRangeInsightsResponse = CampaignRangeInsight[];
export type AccountReportRow = FacebookAdAccount & { todaySpend?: number; yesterdaySpend?: number; mtdSpend?: number; selectedSpend?: number; sourceCurrency?: string; billingLink?: string; campaignLink?: string; billingThreshold?: number | null; lastCharge?: number | null; error?: { message: string; category: string } | null };
export const getAccountReport = (agencyId: string, range: { since: string; until: string }, signal?: AbortSignal) => { const params = new URLSearchParams(range); return apiRequest<AccountReportRow[]>(`/campaigns/${agencyId}/account-report?${params.toString()}`, { signal }); };
export const getCampaignRangeInsights = (agencyId: string, range: { since: string; until: string }, signal?: AbortSignal) => {
  const params = new URLSearchParams(range);
  return apiRequest<CampaignRangeInsightsResponse>(`/campaigns/${agencyId}/insights?${params.toString()}`, { signal });
};

export const assignCampaignClient = (agencyId: string, campaignId: string, clientId: string | null) => {
  return apiRequest<Campaign>(`/campaigns/${agencyId}/${campaignId}/client-assignment`, {
    method: "PATCH",
    body: JSON.stringify({ clientId }),
  });
};

export const assignCampaignRequest = (agencyId: string, campaignId: string, adRequestId: string | null) => {
  return apiRequest<Campaign>(`/campaigns/${agencyId}/${campaignId}/request-assignment`, {
    method: "PATCH",
    body: JSON.stringify({ adRequestId }),
  });
};

export const assignClientAdAccount = (agencyId: string, clientId: string, facebookAdAccountId: string, assigned: boolean) => {
  return apiRequest<Client>(`/clients/${agencyId}/${clientId}/facebook-accounts`, {
    method: "PATCH",
    body: JSON.stringify({ facebookAdAccountId, assigned }),
  });
};
