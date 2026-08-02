import { apiRequest } from "../../lib/api";
import type { AgencyProfile, FacebookAdAccount, FacebookOverview, FacebookSyncJob } from "../../types/crm";

export const getAgency = (agencyId: string) => apiRequest<AgencyProfile>(`/agency/${agencyId}`);
export const saveAgencySettings = (agencyId: string, payload: Partial<Pick<AgencyProfile, "name" | "defaultRate" | "defaultCurrency">>) => apiRequest(`/agency/${agencyId}`, { method: "PATCH", body: JSON.stringify(payload) });
export const saveFacebookSettings = (agencyId: string, payload: { accessToken: string; defaultAdAccountId?: string }) => apiRequest(`/agency/${agencyId}/facebook`, { method: "POST", body: JSON.stringify(payload) });
export const getFacebookOverview = (agencyId: string) => apiRequest<FacebookOverview>(`/agency/${agencyId}/facebook-overview`);
export const listFacebookAccounts = (agencyId: string) => apiRequest<FacebookAdAccount[]>(`/agency/${agencyId}/facebook-accounts`);
export const enqueueFacebookSync = (agencyId: string) => apiRequest<FacebookSyncJob>(`/agency/${agencyId}/facebook-sync-jobs`, { method: "POST" });
export const syncFacebookOverview = enqueueFacebookSync;
export const getActiveFacebookSync = (agencyId: string) => apiRequest<FacebookSyncJob | null>(`/agency/${agencyId}/facebook-sync-jobs/active`);
export const getFacebookSyncJob = (agencyId: string, jobId: string) => apiRequest<FacebookSyncJob>(`/agency/${agencyId}/facebook-sync-jobs/${jobId}`);
export const getFacebookSyncHistory = (agencyId: string, limit = 10) => apiRequest<FacebookSyncJob[]>(`/agency/${agencyId}/facebook-sync-jobs?limit=${limit}`);
export const retryFacebookSyncAccount = (agencyId: string, jobId: string, accountId: string) => apiRequest<FacebookSyncJob>(`/agency/${agencyId}/facebook-sync-jobs/${jobId}/accounts/${accountId}/retry`, { method: "POST" });
export const disconnectFacebook = (agencyId: string, revokeRemote = false) => apiRequest<{ disconnected: boolean; remoteRevoked: boolean }>(`/agency/${agencyId}/facebook`, { method: "DELETE", body: JSON.stringify({ revokeRemote }) });
