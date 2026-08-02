import { apiRequest } from "../../lib/api";
import type { Client } from "../../types/crm";

export const createClient = (agencyId: string, payload: Omit<Client, "_id">) => apiRequest<Client>(`/clients/${agencyId}`, { method: "POST", body: JSON.stringify(payload) });
export const updateClient = (agencyId: string, clientId: string, payload: Partial<Client>) => apiRequest<Client>(`/clients/${agencyId}/${clientId}`, { method: "PATCH", body: JSON.stringify(payload) });
export const deleteClient = (agencyId: string, clientId: string) => apiRequest<null>(`/clients/${agencyId}/${clientId}`, { method: "DELETE" });
