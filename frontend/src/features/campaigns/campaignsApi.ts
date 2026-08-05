import { apiRequest } from "../../lib/api";
import type { AdPlatform, Campaign, Client } from "../../types/crm";

export type CreateCampaignPayload = { client: string; adRequest: string; name: string; platform: AdPlatform; objective: string; budget: { amount: number; type: "daily" | "lifetime"; currency: string } };
export type UpdateCampaignPayload = { name?: string; objective?: string; budget?: { amount: number; type: "daily" | "lifetime"; currency?: string }; status?: Campaign["status"]; client?: string; adRequest?: string };
export const createCampaign = (agencyId: string, payload: CreateCampaignPayload) => apiRequest<Campaign>(`/campaigns/${agencyId}`, { method: "POST", body: JSON.stringify(payload) });
export const deleteCampaign = (agencyId: string, campaignId: string) => apiRequest<null>(`/campaigns/${agencyId}/${campaignId}`, { method: "DELETE" });

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
