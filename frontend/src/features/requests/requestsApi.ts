import { apiRequest } from "../../lib/api";
import type { ActivityLog, AdPlatform, AdRequest, RequestStatus } from "../../types/crm";

export interface AdRequestPayload {
  client?: string;
  pageName: string;
  platform: AdPlatform;
  objectiveGroup: string;
  objective: string;
  budget: { amount: number; type: "daily" | "lifetime"; currency: "USD" | "BDT" | "INR" };
  durationDays: number;
  notes?: string;
  contentLink?: string;
}

export type AdRequestUpdatePayload = Partial<AdRequestPayload>;
export interface RequestStatusPayload { status: RequestStatus; agencyNote?: string; rejectionReason?: string }

export const createAdRequest = (agencyId: string, payload: AdRequestPayload) => apiRequest<AdRequest>(`/requests/${agencyId}`, {
  method: "POST",
  body: JSON.stringify(payload),
});

export const getAdRequest = (agencyId: string, requestId: string) => apiRequest<AdRequest>(`/requests/${agencyId}/${requestId}`);

export const updateAdRequest = (agencyId: string, requestId: string, payload: AdRequestUpdatePayload) => apiRequest<AdRequest>(`/requests/${agencyId}/${requestId}`, {
  method: "PATCH",
  body: JSON.stringify(payload),
});

export const deleteAdRequest = (agencyId: string, requestId: string) => apiRequest<null>(`/requests/${agencyId}/${requestId}`, { method: "DELETE" });

export const getAdRequestActivity = (agencyId: string, requestId: string) => apiRequest<ActivityLog[]>(`/requests/${agencyId}/${requestId}/activity`);

export const updateRequestStatus = (agencyId: string, requestId: string, payload: RequestStatusPayload) => apiRequest<AdRequest>(`/requests/${agencyId}/${requestId}/status`, {
  method: "PATCH",
  body: JSON.stringify(payload),
});
