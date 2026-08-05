import { apiRequest } from "../../lib/api";
import type { ClientUpdate } from "../../types/crm";

export type UpdatePayload = { client: string; adRequest: string; title: string; content: string; type?: ClientUpdate["type"] };
export type EditUpdatePayload = Partial<UpdatePayload>;
export const createUpdate = (agencyId: string, payload: UpdatePayload) => apiRequest<ClientUpdate>(`/updates/${agencyId}`, { method: "POST", body: JSON.stringify(payload) });
export const updateClientUpdate = (agencyId: string, id: string, payload: EditUpdatePayload) => apiRequest<ClientUpdate>(`/updates/${agencyId}/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const deleteUpdate = (agencyId: string, id: string) => apiRequest<null>(`/updates/${agencyId}/${id}`, { method: "DELETE" });
export const markUpdateRead = (agencyId: string, id: string) => apiRequest<ClientUpdate>(`/updates/${agencyId}/${id}/read`, { method: "PATCH" });
