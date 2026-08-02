import { apiRequest } from "../../lib/api";
import type { AgencyProfile, FacebookOverview } from "../../types/crm";

export const getAgency = (agencyId: string) => apiRequest<AgencyProfile>(`/agency/${agencyId}`);

export const saveAgencySettings = (agencyId: string, payload: Partial<Pick<AgencyProfile, "name" | "defaultRate" | "defaultCurrency">>) => {
  return apiRequest(`/agency/${agencyId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
};

export const saveFacebookSettings = (agencyId: string, payload: { accessToken: string; defaultAdAccountId: string }) => {
  return apiRequest(`/agency/${agencyId}/facebook`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const getFacebookOverview = (agencyId: string) => {
  return apiRequest<FacebookOverview>(`/agency/${agencyId}/facebook-overview`);
};

export const syncFacebookOverview = (agencyId: string) => {
  return apiRequest<{ synced: boolean; mode: string; message: string; overview: FacebookOverview }>(`/agency/${agencyId}/facebook-sync`, {
    method: "POST",
  });
};
