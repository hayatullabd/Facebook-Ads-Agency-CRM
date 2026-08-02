import { apiRequest } from "../../lib/api";
import type { Campaign, Client } from "../../types/crm";

export const updateCampaign = (agencyId: string, campaignId: string, payload: Partial<Campaign>) => {
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
