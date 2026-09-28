import { apiRequest } from "../lib/api";
import type { AdRequest, Campaign, Client, ClientUpdate, FacebookAdAccount, FacebookOverview, Invoice, Role, UserAccount } from "../types/crm";

export interface WorkspaceData {
  clients: Client[];
  requests: AdRequest[];
  campaigns: Campaign[];
  invoices: Invoice[];
  updates: ClientUpdate[];
  users: UserAccount[];
  facebook: FacebookOverview | null;
  facebookAccounts: FacebookAdAccount[];
}

export type WorkspaceResource = keyof WorkspaceData;

export interface WorkspaceResourceRequest<K extends WorkspaceResource = WorkspaceResource> {
  key: K;
  load: () => Promise<WorkspaceData[K]>;
}

export function getWorkspaceRequests(agencyId: string, role: Role, features?: string[], featuresConfigured?: boolean): WorkspaceResourceRequest[] {
  const limited = role === "team" && featuresConfigured;
  const allowed = (feature: string) => !limited || (features || []).includes(feature);
  const requests: WorkspaceResourceRequest[] = [
    { key: "updates", load: () => apiRequest<ClientUpdate[]>(`/updates/${agencyId}`) },
    { key: "users", load: () => apiRequest<UserAccount[]>(`/users/${agencyId}`) },
    { key: "facebook", load: () => apiRequest<FacebookOverview>(`/agency/${agencyId}/facebook-overview`) },
  ];

  if (allowed("requests")) requests.push({ key: "requests", load: () => apiRequest<AdRequest[]>(`/requests/${agencyId}`) });
  if (allowed("adaccounts")) requests.push({ key: "facebookAccounts", load: () => apiRequest<FacebookAdAccount[]>(`/agency/${agencyId}/facebook-accounts`) });
  if (role !== "moderator" && allowed("billing")) requests.push({ key: "invoices", load: () => apiRequest<Invoice[]>(`/invoices/${agencyId}`) });
  if (["owner", "admin", "team", "client", "moderator"].includes(role) && allowed("campaigns")) {
    requests.push({ key: "campaigns", load: () => apiRequest<Campaign[]>(`/campaigns/${agencyId}`) });
  }
  if (["owner", "admin", "team", "client", "moderator"].includes(role) && allowed("clients")) {
    requests.push({ key: "clients", load: () => apiRequest<Client[]>(`/clients/${agencyId}`) });
  }

  return requests;
}
