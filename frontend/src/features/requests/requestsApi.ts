import { apiRequest } from "../../lib/api";
import type { AdRequest } from "../../types/crm";

export const createAdRequest = (agencyId: string, payload: Partial<AdRequest> & Record<string, unknown>) => {
  return apiRequest<AdRequest>(`/requests/${agencyId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const updateRequestStatus = (agencyId: string, requestId: string, payload: { status: string; agencyNote?: string; rejectionReason?: string }) => {
  return apiRequest<AdRequest>(`/requests/${agencyId}/${requestId}/status`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
};
