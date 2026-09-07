import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../../../lib/api";
import type { Client } from "../../../types/crm";
import { Card } from "../../shared/Card";

type Pending = { _id: string; name: string; email?: string; owner?: { name: string; email: string }; role?: string };
export function ApprovalsPage({ agencyId, platformAdmin, clients, onRefresh }: { agencyId: string; platformAdmin: boolean; clients: Client[]; onRefresh: () => Promise<boolean> }) {
  const [workspaces, setWorkspaces] = useState<Pending[]>([]);
  const [users, setUsers] = useState<Pending[]>([]);
  const [choices, setChoices] = useState<Record<string, { role: string; client: string }>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [nextUsers, nextWorkspaces] = await Promise.all([
        apiRequest<Pending[]>(`/approvals/users/${agencyId}`),
        platformAdmin ? apiRequest<Pending[]>("/approvals/workspaces") : Promise.resolve([]),
      ]);
      setUsers(nextUsers); setWorkspaces(nextWorkspaces);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load approvals"); }
    finally { setLoading(false); }
  }, [agencyId, platformAdmin]);
  useEffect(() => { void load(); }, [load]);
  const decide = async (kind: "users" | "workspaces", item: Pending, decision: "approve" | "reject") => {
    if (!window.confirm(`${decision === "approve" ? "Approve" : "Reject"} ${item.name}?`)) return;
    setBusy(item._id); setError("");
    try {
      const choice = choices[item._id] || { role: "client", client: "" };
      if (kind === "users" && decision === "approve" && choice.role !== "team" && !choice.client) throw new Error("Select a client before approving this user");
      await apiRequest(`/approvals/${kind}/${kind === "users" ? `${agencyId}/` : ""}${item._id}/${decision}`, {
        method: "POST", body: JSON.stringify(kind === "users" && decision === "approve" ? { role: choice.role, ...(choice.role !== "team" ? { client: choice.client } : {}) } : {}),
      });
      await load(); await onRefresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Review failed"); }
    finally { setBusy(""); }
  };
  const rows = (items: Pending[], kind: "users" | "workspaces") => items.map(item => {
    const choice = choices[item._id] || { role: "client", client: "" };
    return <div key={item._id} className="flex flex-wrap items-center gap-3 border-t p-4"><div className="min-w-48 flex-1"><p className="font-semibold">{item.name}</p><p className="text-sm text-slate-500">{item.email || item.owner?.email}</p></div>{kind === "users" && <><label>Assign role<select className="crm-input" aria-label={`Role for ${item.name}`} value={choice.role} onChange={event => setChoices(previous => ({ ...previous, [item._id]: { ...choice, role: event.target.value } }))}><option value="team">Team</option><option value="client">Client</option><option value="moderator">Moderator</option></select></label>{choice.role !== "team" && <label>Client<select className="crm-input" aria-label={`Client for ${item.name}`} value={choice.client} onChange={event => setChoices(previous => ({ ...previous, [item._id]: { ...choice, client: event.target.value } }))}><option value="">Select client</option>{clients.map(client => <option value={client._id} key={client._id}>{client.name}</option>)}</select></label>}</>}<button disabled={Boolean(busy)} className="rounded bg-blue-800 px-3 py-2 text-white disabled:opacity-50" onClick={() => void decide(kind, item, "approve")}>Approve</button><button disabled={Boolean(busy)} className="rounded border border-red-300 px-3 py-2 text-red-700 disabled:opacity-50" onClick={() => void decide(kind, item, "reject")}>Reject</button></div>;
  });
  return <div className="space-y-4"><h2 className="text-xl font-semibold">Registration approvals</h2>{error && <div role="alert" className="rounded bg-red-50 p-3 text-red-800">{error} <button className="underline" onClick={() => void load()}>Retry</button></div>}{loading && <p role="status">Loading approvals...</p>}{platformAdmin && <Card><h3 className="p-4 font-semibold">Pending workspaces</h3>{rows(workspaces, "workspaces")}{!loading && !workspaces.length && <p className="p-4">No pending workspaces.</p>}</Card>}<Card><h3 className="p-4 font-semibold">Pending workspace users</h3>{rows(users, "users")}{!loading && !users.length && <p className="p-4">No pending users.</p>}</Card></div>;
}
