import { useCallback, useEffect, useRef, useState } from "react";
import type { FacebookOverview, FacebookSyncJob } from "../../../types/crm";
import { disconnectFacebook, enqueueFacebookSync, getFacebookOverview, getFacebookSyncHistory, retryFacebookSyncAccount } from "../settingsApi";
import { formatDate } from "../../../lib/formatters";
export function FacebookSyncPanel({ agencyId, onRefresh }: { agencyId: string; onRefresh: () => Promise<boolean> }) {
  const [overview, setOverview] = useState<FacebookOverview | null>(null);
  const [jobs, setJobs] = useState<FacebookSyncJob[]>([]);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const wasActive = useRef(false);
  const load = useCallback(async () => {
    const [connection, history] = await Promise.all([getFacebookOverview(agencyId), getFacebookSyncHistory(agencyId)]);
    setOverview(connection); setJobs(history);
    const active = history.some(job => ["queued", "running"].includes(job.status));
    if (wasActive.current && !active) await onRefresh();
    wasActive.current = active;
  }, [agencyId, onRefresh]);
  useEffect(() => {
    let stopped = false; let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try { await load(); } catch (reason) { if (!stopped) setError(reason instanceof Error ? reason.message : "Could not load sync status"); }
      if (!stopped) timer = setTimeout(poll, 10000);
    };
    void poll(); return () => { stopped = true; clearTimeout(timer); };
  }, [load]);
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true); setError("");
    try { await action(); await load(); await onRefresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Facebook operation failed"); }
    finally { setBusy(false); }
  };
  const active = jobs.some(job => ["queued", "running"].includes(job.status));
  return <section className="mt-6 space-y-3 border-t pt-4"><h3 className="font-semibold">Facebook connection & synchronization</h3><p className="text-sm">Status: {overview?.connection.isConnected ? "Connected" : "Not connected"} · Accounts: {overview?.connection.accountCount ?? 0}</p><p className="text-xs text-slate-500">Last sync: {overview?.connection.lastSyncAt ? formatDate(overview.connection.lastSyncAt) : "Never"}. Saving a token connects Facebook; start a sync to import campaigns.</p>{error && <p role="alert" className="text-red-700">{error}</p>}<div className="flex flex-wrap gap-3"><button disabled={busy || active || !overview?.connection.isConnected} className="rounded bg-blue-800 px-3 py-2 text-white disabled:opacity-50" onClick={() => void run(() => enqueueFacebookSync(agencyId))}>{active ? "Sync in progress..." : "Sync now"}</button><button disabled={busy} className="rounded border px-3 py-2" onClick={() => void run(load)}>Refresh status</button><button disabled={busy || active || !overview?.connection.isConnected} className="rounded border border-red-300 px-3 py-2 text-red-700 disabled:opacity-50" onClick={() => { if (window.confirm("Disconnect Facebook locally? This removes the stored token but does not revoke it at Facebook.")) void run(() => disconnectFacebook(agencyId)); }}>Disconnect</button></div>{jobs.map(job => <details key={job.id} className="rounded border p-3"><summary className="cursor-pointer text-sm">{formatDate(job.createdAt)} · {job.status} · {job.progress.completed}/{job.progress.total} accounts</summary>{job.error && <p className="mt-2 text-red-700">{job.error.message}</p>}<div className="mt-2 space-y-2">{job.accounts.map(account => <div key={account.accountId} className="text-sm"><span>{account.name || account.accountId} · {account.status}</span>{account.error && <span className="ml-2 text-red-700">{account.error.message}</span>}{account.status === "failed" && account.error?.retryable && <button disabled={busy || active} className="ml-3 underline" onClick={() => void run(() => retryFacebookSyncAccount(agencyId, job.id, account.accountId))}>Retry account</button>}</div>)}</div></details>)}</section>;
}
