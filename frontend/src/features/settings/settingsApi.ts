import { apiRequest } from "../../lib/api";
import type { AgencyProfile, FacebookAdAccount, FacebookOverview, FacebookSyncResult } from "../../types/crm";
export const getAgency = (agencyId: string) => apiRequest<AgencyProfile>(`/agency/${agencyId}`);
export const saveAgencySettings = (agencyId: string, payload: Partial<Pick<AgencyProfile, "name" | "defaultRate" | "defaultCurrency">>) => apiRequest(`/agency/${agencyId}`, { method: "PATCH", body: JSON.stringify(payload) });
export const saveFacebookSettings = (agencyId: string, payload: { accessToken: string; defaultAdAccountId?: string }) => apiRequest(`/agency/${agencyId}/facebook`, { method: "POST", body: JSON.stringify(payload) });
export const getFacebookOverview = (agencyId: string) => apiRequest<FacebookOverview>(`/agency/${agencyId}/facebook-overview`);
export const listFacebookAccounts = (agencyId: string) => apiRequest<FacebookAdAccount[]>(`/agency/${agencyId}/facebook-accounts`);
export const syncFacebookOverview = (agencyId: string) => apiRequest<FacebookSyncResult>(`/agency/${agencyId}/facebook-sync`, { method: "POST" });
export const disconnectFacebook = (agencyId: string, revokeRemote = false) => apiRequest<{ disconnected: boolean; remoteRevoked: boolean }>(`/agency/${agencyId}/facebook`, { method: "DELETE", body: JSON.stringify({ revokeRemote }) });
