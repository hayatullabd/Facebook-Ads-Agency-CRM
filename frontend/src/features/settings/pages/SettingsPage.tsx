import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, RefreshCw, Settings2, Unplug } from "lucide-react";
import type { FacebookOverview, FacebookSyncJob } from "../../../types/crm";
import { formatMoney } from "../../../lib/formatters";
import { Card } from "../../shared/Card";
import { StatusBadge } from "../../shared/StatusBadge";
import { Button } from "../../shared/Button";
import {
  disconnectFacebook, enqueueFacebookSync, getActiveFacebookSync, getAgency, getFacebookOverview,
  getFacebookSyncHistory, getFacebookSyncJob, retryFacebookSyncAccount, saveAgencySettings, saveFacebookSettings,
} from "../settingsApi";

const terminal = (job: FacebookSyncJob) => ["success", "partial", "failed"].includes(job.status);
const stageLabels = { queued: "Waiting to start", discovery: "Discovering ad accounts", accounts: "Syncing accounts", complete: "Complete" };

export function SettingsPage({ agencyId, onWorkspaceRefresh }: { agencyId: string; onWorkspaceRefresh: () => Promise<boolean> }) {
  const [agencyName, setAgencyName] = useState("");
  const [defaultRate, setDefaultRate] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [account, setAccount] = useState("");
  const [overview, setOverview] = useState<FacebookOverview | null>(null);
  const [job, setJob] = useState<FacebookSyncJob | null>(null);
  const [history, setHistory] = useState<FacebookSyncJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const alive = useRef(true);
  const refreshedJobs = useRef(new Set<string>());

  const load = useCallback(async () => {
    const [agency, facebook, active, jobs] = await Promise.all([
      getAgency(agencyId), getFacebookOverview(agencyId), getActiveFacebookSync(agencyId), getFacebookSyncHistory(agencyId, 10),
    ]);
    if (!alive.current) return;
    setAgencyName(agency.name); setDefaultRate(String(agency.defaultRate)); setOverview(facebook);
    setAccount(facebook.connection.adAccountId || ""); setJob(active); setHistory(jobs);
  }, [agencyId]);

  useEffect(() => {
    alive.current = true; setLoading(true); setError("");
    void load().catch((err) => alive.current && setError(err instanceof Error ? err.message : "Could not load settings")).finally(() => alive.current && setLoading(false));
    return () => { alive.current = false; };
  }, [load]);

  useEffect(() => {
    if (!job || (terminal(job) && refreshedJobs.current.has(job.id))) return;
    let timer: number;
    const poll = async () => {
      try {
        const next = await getFacebookSyncJob(agencyId, job.id);
        if (!alive.current) return;
        setJob(next);
        if (terminal(next) && !refreshedJobs.current.has(next.id)) {
          const [facebook, jobs, workspaceOk] = await Promise.all([
            getFacebookOverview(agencyId), getFacebookSyncHistory(agencyId, 10), onWorkspaceRefresh(),
          ]);
          if (!alive.current) return;
          if (workspaceOk) {
            refreshedJobs.current.add(next.id);
            setOverview(facebook); setHistory(jobs); setMessage(`Facebook sync finished: ${next.status}.`);
            return;
          }
          setError("Some workspace data could not be refreshed; retrying.");
        }
      } catch (err) { if (alive.current) setError(err instanceof Error ? err.message : "Could not refresh sync progress"); }
      if (alive.current) timer = window.setTimeout(poll, document.hidden ? 10000 : 4000);
    };
    const visibility = () => { if (!document.hidden) { window.clearTimeout(timer); void poll(); } };
    timer = window.setTimeout(poll, document.hidden ? 10000 : 4000);
    document.addEventListener("visibilitychange", visibility);
    return () => { window.clearTimeout(timer); document.removeEventListener("visibilitychange", visibility); };
  }, [agencyId, job?.id, job?.status, onWorkspaceRefresh]);

  const save = async (event: FormEvent) => {
    event.preventDefault(); setBusy("save"); setError(""); setMessage("");
    try {
      await saveAgencySettings(agencyId, { name: agencyName, defaultRate: Number(defaultRate) });
    } catch (err) {
      setError(`Agency profile could not be saved: ${err instanceof Error ? err.message : "Unknown error"}`);
      setBusy("");
      return;
    }

    const savingFacebookSettings = Boolean(accessToken.trim());
    if (savingFacebookSettings) {
      try {
        await saveFacebookSettings(agencyId, { accessToken, defaultAdAccountId: account || undefined });
        setAccessToken("");
      } catch (err) {
        setError(`Agency profile was saved, but Facebook settings could not be saved: ${err instanceof Error ? err.message : "Unknown error"}`);
        setBusy("");
        return;
      }
    }

    const workspaceOk = await onWorkspaceRefresh();
    try {
      await load();
      const savedMessage = savingFacebookSettings ? "Agency profile and Facebook settings saved successfully." : "Agency profile saved successfully.";
      if (workspaceOk) setMessage(savedMessage);
      else setError(`${savedMessage} Some workspace data could not be refreshed.`);
    } catch (err) {
      setError(`Settings were saved, but the latest settings could not be reloaded: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally { setBusy(""); }
  };

  const sync = async () => {
    setBusy("sync"); setError(""); setMessage("");
    try { const next = await enqueueFacebookSync(agencyId); setJob(next); setMessage("Facebook sync queued."); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not queue Facebook sync"); }
    finally { setBusy(""); }
  };

  const retry = async (source: FacebookSyncJob, accountId: string) => {
    setBusy(accountId); setError("");
    try { setJob(await retryFacebookSyncAccount(agencyId, source.id, accountId)); setMessage("Account retry queued."); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not queue account retry"); }
    finally { setBusy(""); }
  };

  const disconnect = async (revokeRemote: boolean) => {
    const prompt = revokeRemote ? "Revoke Facebook permissions remotely? You will need to authorize again." : "Disconnect Facebook locally? Synced data and history will be preserved.";
    if (!window.confirm(prompt)) return;
    setBusy("disconnect"); setError("");
    try {
      await disconnectFacebook(agencyId, revokeRemote);
      setJob(null);
      await load();
      const workspaceOk = await onWorkspaceRefresh();
      if (workspaceOk) setMessage("Facebook disconnected. Synced data was preserved.");
      else setError("Facebook was disconnected, but some workspace data could not be refreshed.");
    }
    catch (err) { setError(err instanceof Error ? err.message : "Could not disconnect Facebook"); }
    finally { setBusy(""); }
  };

  const active = Boolean(job && !terminal(job));
  return <form onSubmit={save} className="space-y-5">
    <div><h2 className="crm-page-title">Workspace settings</h2><p className="crm-page-subtitle">Agency defaults and reliable Facebook synchronization</p></div>
    {error && <div role="alert" className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
    {message && <div role="status" className="flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300"><CheckCircle2 className="size-4" />{message}</div>}
    {loading ? <Card className="p-5 text-sm text-slate-400">Loading agency settings...</Card> : <>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5"><div className="mb-5 flex justify-between"><div><h3 className="font-semibold">Agency profile</h3><p className="text-xs text-slate-400">Workspace naming and billing defaults</p></div><Settings2 className="size-5 text-blue-400" /></div><div className="space-y-4"><label><span className="crm-label">Agency name</span><input required className="crm-input" value={agencyName} onChange={(e) => setAgencyName(e.target.value)} /></label><label><span className="crm-label">Default billing rate</span><input required min="1" type="number" className="crm-input" value={defaultRate} onChange={(e) => setDefaultRate(e.target.value)} /></label></div></Card>
        <Card className="p-5"><div className="mb-5 flex justify-between"><div><h3 className="font-semibold">Facebook API</h3><p className="text-xs text-slate-400">Credentials remain server-side</p></div><StatusBadge tone={overview?.connection.isConnected ? "success" : "danger"}>{overview?.connection.status || "unavailable"}</StatusBadge></div><div className="space-y-4"><label><span className="crm-label">Default ad account (optional)</span><input className="crm-input" value={account} onChange={(e) => setAccount(e.target.value)} placeholder="act_..." /></label><label><span className="crm-label">Access token</span><input type="password" autoComplete="off" className="crm-input" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="Leave blank to keep existing token" /></label><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void sync()} disabled={active || busy === "sync" || !overview?.connection.isConnected} className="inline-flex items-center gap-2 rounded-md border border-[#263044] px-3 py-2 text-sm disabled:opacity-50"><RefreshCw className={`size-4 ${active ? "animate-spin" : ""}`} />{active ? "Sync running" : "Sync All Ad Accounts"}</button><button type="button" onClick={() => void disconnect(false)} disabled={Boolean(busy) || !overview?.connection.isConnected} className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 px-3 py-2 text-sm text-amber-300 disabled:opacity-50"><Unplug className="size-4" />Disconnect</button><button type="button" onClick={() => void disconnect(true)} disabled={Boolean(busy) || !overview?.connection.isConnected} className="rounded-md border border-red-500/30 px-3 py-2 text-sm text-red-300 disabled:opacity-50">Revoke access</button></div></div></Card>
      </div>
      <Card className="p-5"><h3 className="font-semibold">Connection overview</h3><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Ad accounts", String(overview?.connection.accountCount || 0)], ["Spend", formatMoney(overview?.overview.spend || 0, overview?.overview.currency)], ["Campaigns", String(overview?.overview.campaignCount || 0)], ["Sync status", overview?.connection.lastSyncStatus || "never"]].map(([label, value]) => <div key={label} className="rounded-md border border-[#20293a] p-3"><p className="text-[10px] uppercase text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>)}</div></Card>
      {job && <Card className="p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold">Current sync</h3><p className="text-xs text-slate-400">{stageLabels[job.stage]} · {job.progress.completed}/{job.progress.total || "?"} complete · {job.progress.succeeded} success · {job.progress.failed} failed</p></div><StatusBadge tone={job.status === "success" ? "success" : job.status === "failed" ? "danger" : "warning"}>{job.status}</StatusBadge></div><div className="mt-4 h-2 overflow-hidden rounded bg-slate-800"><div className={`h-full bg-blue-500 transition-all ${job.stage === "discovery" ? "w-1/3 animate-pulse" : ""}`} style={job.stage === "discovery" ? undefined : { width: `${job.progress.percent}%` }} /></div>{job.error && <p className="mt-3 text-sm text-red-300">{job.error.message}</p>}<div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px]"><thead className="crm-table-head"><tr><th className="px-3 py-2">Account</th><th>Status</th><th>Campaigns</th><th>Inserted</th><th>Updated</th><th>Stale</th><th>Diagnostic</th><th /></tr></thead><tbody>{job.accounts.map((item) => <tr key={item.accountId}><td className="crm-table-cell"><div>{item.name || item.accountId}</div><div className="text-xs text-slate-500">{item.accountId}</div></td><td className="crm-table-cell">{item.status}</td><td className="crm-table-cell">{item.campaignCount === null ? "—" : item.campaignCount}</td><td className="crm-table-cell">{item.upsertedCount}</td><td className="crm-table-cell">{item.modifiedCount}</td><td className="crm-table-cell">{item.staleCount}</td><td className="crm-table-cell text-xs text-red-300">{item.error?.message || "—"}</td><td className="crm-table-cell">{terminal(job) && item.status === "failed" && item.error?.retryable && <button type="button" disabled={active || Boolean(busy)} onClick={() => void retry(job, item.accountId)} className="rounded border border-blue-500/30 px-2 py-1 text-xs text-blue-300 disabled:opacity-50">Retry</button>}</td></tr>)}</tbody></table></div></Card>}
      <Card className="p-5"><h3 className="font-semibold">Sync history</h3><div className="mt-3 space-y-2">{history.length ? history.map((item) => <button key={item.id} type="button" onClick={() => void getFacebookSyncJob(agencyId, item.id).then(setJob)} className="flex w-full flex-wrap items-center justify-between gap-2 rounded-md border border-[#20293a] p-3 text-left"><span><span className="font-medium">{item.kind === "retry" ? "Account retry" : "Full sync"}</span><span className="ml-2 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</span></span><span className="text-xs text-slate-400">{item.status} · {item.progress.succeeded}/{item.progress.total} success</span></button>) : <p className="text-sm text-slate-400">No sync history yet.</p>}</div></Card>
      <div className="flex justify-end"><Button disabled={busy === "save" || !agencyName.trim() || !defaultRate}>{busy === "save" ? "Saving..." : "Save Settings"}</Button></div>
    </>}
  </form>;
}
