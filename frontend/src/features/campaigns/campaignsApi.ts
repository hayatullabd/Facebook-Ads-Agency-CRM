import { apiRequest } from "../../lib/api";
import type { AdPlatform, Campaign, Client, FacebookAdAccount } from "../../types/crm";

export type CreateCampaignPayload = { client: string; adRequest: string; name: string; platform: AdPlatform; objective: string; budget: { amount: number; type: "daily" | "lifetime"; currency: string } };
export type UpdateCampaignPayload = { name?: string; objective?: string; budget?: { amount: number; type: "daily" | "lifetime"; currency?: string }; status?: Campaign["status"]; client?: string; adRequest?: string };
export type CampaignRangeInsight = {
  facebookCampaignId: string;
  objective?: string;
  facebookObjective?: string;
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
export const createCampaign = (agencyId: string, payload: CreateCampaignPayload) => apiRequest<Campaign>(`/campaigns/${agencyId}`, { method: "POST", body: JSON.stringify(payload) });
export const deleteCampaign = (agencyId: string, campaignId: string) => apiRequest<null>(`/campaigns/${agencyId}/${campaignId}`, { method: "DELETE" });
export const getCampaignRangeInsights = (agencyId: string, range: { since: string; until: string }, signal?: AbortSignal) => {
  const params = new URLSearchParams(range);
  return apiRequest<CampaignRangeInsightsResponse>(`/campaigns/${agencyId}/insights?${params.toString()}`, { signal });
};

export const updateCampaign = (agencyId: string, campaignId: string, payload: UpdateCampaignPayload) => {
  return apiRequest<Campaign>(`/campaigns/${agencyId}/${campaignId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
};

export const assignCampaignClient = (agencyId: string, campaignId: string, clientId: string | null) => {
  return apiRequest<Campaign>(`/campaigns/${agencyId}/${campaignId}/client-assignment`, {
    method: "PATCH",
    body: JSON.stringify({ clientId }),
  });
};

export const assignClientAdAccount = (agencyId: string, clientId: string, facebookAdAccountId: string, assigned: boolean) => {
  return apiRequest<Client>(`/clients/${agencyId}/${clientId}/facebook-accounts`, {
    method: "PATCH",
    body: JSON.stringify({ facebookAdAccountId, assigned }),
  });
};
