import { apiRequest } from "../../lib/api";

export interface PlatformWorkspace {
  _id: string;
  name: string;
  status: string;
  subscriptionStatus: string;
  renewalAt?: string | null;
  planName: string;
  planPrice: number | null;
  planCurrency: string;
  clientLimit?: number;
  clientCount?: number;
  ownerName: string;
  ownerEmail: string;
  createdAt: string;
}

export interface PlatformDashboard {
  kpis: {
    activeWorkspaces: number;
    pendingWorkspaces: number;
    suspendedWorkspaces: number;
    activeSubscriptions: number;
    trialingSubscriptions: number;
    pastDueSubscriptions: number;
    plans: number;
    mrr: Record<string, number>;
  };
  pending: PlatformWorkspace[];
  attention: PlatformWorkspace[];
  renewals: PlatformWorkspace[];
  recent: PlatformWorkspace[];
  agencies: PlatformWorkspace[];
}

export const getPlatformDashboard = () => apiRequest<PlatformDashboard>("/dashboard/platform");

export const createWorkspace = (payload: { agencyName: string; name: string; email: string; password: string; plan: string }) => apiRequest<{ agency: { _id: string; name: string; status: string } }>("/approvals/workspaces", {
  method: "POST",
  body: JSON.stringify(payload),
});

export const decideWorkspace = (agencyId: string, decision: "approve" | "reject") => apiRequest<unknown>(`/approvals/workspaces/${agencyId}/${decision}`, {
  method: "POST",
  body: "{}",
});
