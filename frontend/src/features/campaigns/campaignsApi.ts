import { apiRequest } from "../../lib/api";
import type { Campaign } from "../../types/crm";

export const updateCampaign = (agencyId: string, campaignId: string, payload: Partial<Campaign>) => {
  return apiRequest<Campaign>(`/campaigns/${agencyId}/${campaignId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
};
