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

export function getWorkspaceRequests(agencyId: string, role: Role): WorkspaceResourceRequest[] {
  const requests: WorkspaceResourceRequest[] = [
    { key: "requests", load: () => apiRequest<AdRequest[]>(`/requests/${agencyId}`) },
    { key: "updates", load: () => apiRequest<ClientUpdate[]>(`/updates/${agencyId}`) },
    { key: "users", load: () => apiRequest<UserAccount[]>(`/users/${agencyId}`) },
    { key: "facebook", load: () => apiRequest<FacebookOverview>(`/agency/${agencyId}/facebook-overview`) },
    { key: "facebookAccounts", load: () => apiRequest<FacebookAdAccount[]>(`/agency/${agencyId}/facebook-accounts`) },
  ];

  if (role !== "moderator") {
    requests.push({ key: "invoices", load: () => apiRequest<Invoice[]>(`/invoices/${agencyId}`) });
  }

  if (["admin", "team", "client", "moderator"].includes(role)) {
    requests.push({ key: "campaigns", load: () => apiRequest<Campaign[]>(`/campaigns/${agencyId}`) });
  }

  if (["admin", "team", "client"].includes(role)) {
    requests.push({ key: "clients", load: () => apiRequest<Client[]>(`/clients/${agencyId}`) });
  }

  return requests;
}
