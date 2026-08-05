import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, CircleAlert, CircleDashed, Clock3, Database, Facebook, KeyRound, RefreshCw, RotateCcw, Search, Settings2, Unplug } from "lucide-react";
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
const formatDate = (value: string | null | undefined) => value ? new Date(value).toLocaleString() : "Not available";
const statusTone = (status: string): "success" | "danger" | "warning" => status === "success" || status === "connected" ? "success" : status === "failed" || status === "not-connected" ? "danger" : "warning";
const statusIcon = (status: string) => status === "success" || status === "connected" ? CheckCircle2 : status === "failed" ? CircleAlert : CircleDashed;

export function SettingsPage({ agencyId, onWorkspaceRefresh }: { agencyId: string; onWorkspaceRefresh: () => Promise<boolean> }) {
  const [agencyName, setAgencyName] = useState("");
  const [defaultRate, setDefaultRate] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState<"BDT" | "USD" | "INR">("BDT");
  const [accessToken, setAccessToken] = useState("");
  const [account, setAccount] = useState("");
  const [overview, setOverview] = useState<FacebookOverview | null>(null);
  const [job, setJob] = useState<FacebookSyncJob | null>(null);
  const [history, setHistory] = useState<FacebookSyncJob[]>([]);
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatus, setHistoryStatus] = useState("all");
  const [historyKind, setHistoryKind] = useState("all");
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
    setAgencyName(agency.name); setDefaultRate(String(agency.defaultRate)); setDefaultCurrency(agency.defaultCurrency); setOverview(facebook);
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
      await saveAgencySettings(agencyId, { name: agencyName, defaultRate: Number(defaultRate), defaultCurrency });
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
  const connected = Boolean(overview?.connection.isConnected);
  const normalizedHistorySearch = historySearch.trim().toLowerCase();
  const filteredHistory = history.filter((item) => {
    const matchesSearch = !normalizedHistorySearch || [item.id, item.kind, item.status, item.requestedBy, formatDate(item.createdAt)]
      .some((value) => value.toLowerCase().includes(normalizedHistorySearch));
    return matchesSearch && (historyStatus === "all" || item.status === historyStatus) && (historyKind === "all" || item.kind === historyKind);
  });
  const historyFiltered = Boolean(normalizedHistorySearch || historyStatus !== "all" || historyKind !== "all");

  return <form onSubmit={save} className="space-y-5">
    <div>
      <h2 className="crm-page-title">Workspace settings</h2>
      <p className="crm-page-subtitle">Agency defaults and reliable Facebook synchronization</p>
    </div>
    {error && <div role="alert" className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
    {message && <div role="status" className="flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300"><CheckCircle2 className="size-4" />{message}</div>}
    {loading ? <Card className="p-5 text-sm text-slate-400">Loading agency settings...</Card> : <>
      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="p-5">
          <div className="mb-5 flex justify-between">
            <div><h3 className="font-semibold">Agency profile</h3><p className="text-xs text-slate-400">Workspace naming and billing defaults</p></div>
            <Settings2 className="size-5 text-blue-400" />
          </div>
          <div className="space-y-4">
            <label><span className="crm-label">Agency name</span><input required className="crm-input" value={agencyName} onChange={(e) => setAgencyName(e.target.value)} /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label><span className="crm-label">Default billing rate</span><input required min="1" type="number" className="crm-input" value={defaultRate} onChange={(e) => setDefaultRate(e.target.value)} /></label>
              <label><span className="crm-label">Default currency</span><select className="crm-input" value={defaultCurrency} onChange={(e) => setDefaultCurrency(e.target.value as "BDT" | "USD" | "INR")}><option value="BDT">BDT</option><option value="USD">USD</option><option value="INR">INR</option></select></label>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex flex-col gap-4 border-b border-[#20293a] pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-blue-500/20 bg-blue-500/10 text-blue-400"><Facebook className="size-5" /></div>
              <div>
                <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">Facebook Ads integration</h3><StatusBadge tone={connected ? "success" : "danger"}>{connected ? "Connected" : "Not connected"}</StatusBadge></div>
                <p className="mt-1 text-xs leading-5 text-slate-400">{connected ? `${overview?.connection.accountCount || 0} ad accounts available for synchronization.` : "Add an access token to connect and discover your ad accounts."}</p>
              </div>
            </div>
            <Button type="button" onClick={() => void sync()} disabled={active || busy === "sync" || !connected} className="shrink-0">
              <RefreshCw className={`size-4 ${active ? "animate-spin" : ""}`} />{active ? "Sync running" : "Sync all accounts"}
            </Button>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label><span className="crm-label">Default ad account (optional)</span><input disabled={!accessToken.trim()} className="crm-input" value={account} onChange={(e) => setAccount(e.target.value)} placeholder="act_..." /><span className="mt-1.5 block text-xs text-slate-500">To change the default account, enter a new access token first; otherwise the saved account is kept.</span></label>
            <label><span className="crm-label">Access token</span><div className="relative"><KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" /><input type="password" autoComplete="off" className="crm-input pl-9" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder={overview?.connection.tokenConfigured ? "Token configured — leave blank to keep" : "Enter Facebook access token"} /></div></label>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">Credentials are encrypted and remain server-side.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void disconnect(false)} disabled={Boolean(busy) || !connected} className="inline-flex items-center gap-2 rounded-md border border-[#2a3549] px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-amber-500/40 hover:text-amber-300 disabled:opacity-50"><Unplug className="size-3.5" />Disconnect</button>
              <button type="button" onClick={() => void disconnect(true)} disabled={Boolean(busy) || !connected} className="rounded-md border border-transparent px-3 py-2 text-xs font-medium text-slate-500 transition hover:border-red-500/30 hover:text-red-300 disabled:opacity-50">Revoke access</button>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div><h3 className="font-semibold">Connection overview</h3><p className="mt-1 text-xs text-slate-400">Facebook data coverage and synchronization health</p></div>
          <span className="text-xs text-slate-500">Last sync: {formatDate(overview?.connection.lastSyncAt)}</span>
        </div>
        <div className="mt-4 grid gap-px overflow-hidden rounded-md border border-[#20293a] bg-[#20293a] sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-[#101522] p-4"><Database className="size-4 text-blue-400" /><p className="mt-3 text-2xl font-semibold tabular-nums">{overview?.connection.accountCount || 0}</p><p className="mt-1 text-xs text-slate-400">Ad accounts</p></div>
          <div className="bg-[#101522] p-4"><Facebook className="size-4 text-blue-400" /><p className="mt-3 text-2xl font-semibold tabular-nums">{overview?.overview.campaignCount || 0}</p><p className="mt-1 text-xs text-slate-400">Campaigns</p></div>
          <div className="bg-[#101522] p-4"><Database className="size-4 text-blue-400" /><p className="mt-3 text-2xl font-semibold tabular-nums">{formatMoney(overview?.overview.spend || 0, overview?.overview.currency)}</p><p className="mt-1 text-xs text-slate-400">Tracked spend</p></div>
          <div className="bg-[#101522] p-4"><Clock3 className="size-4 text-blue-400" /><div className="mt-3"><StatusBadge tone={statusTone(overview?.connection.lastSyncStatus || "never")}>{overview?.connection.lastSyncStatus || "never"}</StatusBadge></div><p className="mt-2 truncate text-xs text-slate-400" title={formatDate(overview?.connection.lastSyncAt)}>{formatDate(overview?.connection.lastSyncAt)}</p></div>
        </div>
      </Card>

      {job ? <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div><p className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">{stageLabels[job.stage]}</p><h3 className="mt-1 font-semibold">{job.kind === "retry" ? "Account retry" : "Current sync job"}</h3></div>
          <div className="flex items-center gap-3"><span className="text-2xl font-semibold tabular-nums">{job.stage === "discovery" ? "—" : `${job.progress.percent}%`}</span><StatusBadge tone={statusTone(job.status)}>{job.status}</StatusBadge></div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded bg-slate-800" role="progressbar" aria-label="Facebook account sync progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={job.stage === "discovery" ? undefined : job.progress.percent} aria-valuetext={job.stage === "discovery" ? "Discovering ad accounts" : `${job.progress.percent}% complete`}>
          <div className={`h-full bg-blue-500 transition-all ${job.stage === "discovery" ? "w-1/3 animate-[pulse_1.5s_ease-in-out_infinite]" : ""}`} style={job.stage === "discovery" ? undefined : { width: `${job.progress.percent}%` }} />
        </div>
        <div className="mt-4 grid gap-px overflow-hidden rounded-md border border-[#20293a] bg-[#20293a] grid-cols-2 lg:grid-cols-4">
          {[["Completed", job.progress.completed], ["Succeeded", job.progress.succeeded], ["Failed", job.progress.failed], ["Total", job.progress.total || "Pending"]].map(([label, value]) => <div key={label} className="bg-[#101522] p-3"><p className="text-lg font-semibold tabular-nums">{value}</p><p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p></div>)}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-400"><span>Started: {formatDate(job.startedAt)}</span><span>Finished: {formatDate(job.completedAt)}</span></div>
        {job.error && <div className="mt-4 flex gap-2 border-l-2 border-red-500 bg-red-500/5 p-3 text-sm text-red-300"><CircleAlert className="mt-0.5 size-4 shrink-0" /><span><strong className="font-semibold">{job.error.category}:</strong> {job.error.message}</span></div>}

        {job.accounts.length ? <>
          <div className="mt-6 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[850px]">
              <thead className="crm-table-head"><tr><th className="px-3 py-2">Account</th><th>Status</th><th>Campaigns</th><th>Inserted</th><th>Updated</th><th>Stale</th><th>Diagnostic</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>{job.accounts.map((item) => {
                const Icon = statusIcon(item.status);
                const retryable = terminal(job) && item.status === "failed" && item.error?.retryable;
                return <tr key={item.accountId} className="border-t border-[#20293a]">
                  <td className="crm-table-cell"><div className="font-medium">{item.name || item.accountId}</div><div className="text-xs text-slate-500">{item.accountId}</div></td>
                  <td className="crm-table-cell"><div className="flex items-center gap-2"><Icon className={`size-4 ${item.status === "success" ? "text-emerald-400" : item.status === "failed" ? "text-red-400" : "text-amber-400"}`} /><StatusBadge tone={statusTone(item.status)}>{item.status}</StatusBadge></div></td>
                  <td className="crm-table-cell tabular-nums">{item.campaignCount === null ? "—" : item.campaignCount}</td><td className="crm-table-cell tabular-nums">{item.upsertedCount}</td><td className="crm-table-cell tabular-nums">{item.modifiedCount}</td><td className="crm-table-cell tabular-nums">{item.staleCount}</td>
                  <td className="crm-table-cell max-w-[260px] text-xs">{item.error ? <><span className="block font-medium text-red-300">{item.error.category}</span><span className="mt-0.5 block whitespace-normal text-slate-400">{item.error.message}</span></> : <span className="text-slate-500">No errors</span>}</td>
                  <td className="crm-table-cell">{retryable && <button type="button" aria-label={`Retry sync for ${item.name || item.accountId}`} disabled={active || Boolean(busy)} onClick={() => void retry(job, item.accountId)} className="inline-flex items-center gap-1.5 rounded border border-blue-500/30 px-2 py-1 text-xs text-blue-300 disabled:opacity-50"><RotateCcw className="size-3" />Retry</button>}</td>
                </tr>;
              })}</tbody>
            </table>
          </div>
          <div className="mt-6 space-y-3 md:hidden">{job.accounts.map((item) => {
            const Icon = statusIcon(item.status);
            const retryable = terminal(job) && item.status === "failed" && item.error?.retryable;
            return <div key={item.accountId} className="border border-[#20293a] bg-[#101522] p-4">
              <div className="flex items-start justify-between gap-3"><div><p className="font-medium">{item.name || item.accountId}</p><p className="text-xs text-slate-500">{item.accountId}</p></div><div className="flex items-center gap-1.5"><Icon className={`size-4 ${item.status === "success" ? "text-emerald-400" : item.status === "failed" ? "text-red-400" : "text-amber-400"}`} /><StatusBadge tone={statusTone(item.status)}>{item.status}</StatusBadge></div></div>
              <dl className="mt-4 grid grid-cols-4 gap-2 text-center"><div><dt className="text-[9px] uppercase text-slate-500">Campaigns</dt><dd className="mt-1 text-sm font-semibold">{item.campaignCount === null ? "—" : item.campaignCount}</dd></div><div><dt className="text-[9px] uppercase text-slate-500">Inserted</dt><dd className="mt-1 text-sm font-semibold">{item.upsertedCount}</dd></div><div><dt className="text-[9px] uppercase text-slate-500">Updated</dt><dd className="mt-1 text-sm font-semibold">{item.modifiedCount}</dd></div><div><dt className="text-[9px] uppercase text-slate-500">Stale</dt><dd className="mt-1 text-sm font-semibold">{item.staleCount}</dd></div></dl>
              {item.error && <div className="mt-4 border-l-2 border-red-500 pl-3 text-xs"><p className="font-medium text-red-300">{item.error.category}</p><p className="mt-1 text-slate-400">{item.error.message}</p></div>}
              {retryable && <button type="button" aria-label={`Retry sync for ${item.name || item.accountId}`} disabled={active || Boolean(busy)} onClick={() => void retry(job, item.accountId)} className="mt-4 inline-flex items-center gap-1.5 rounded border border-blue-500/30 px-2.5 py-1.5 text-xs text-blue-300 disabled:opacity-50"><RotateCcw className="size-3" />Retry account</button>}
            </div>;
          })}</div>
        </> : <div className="mt-6 border border-dashed border-[#2a3549] p-6 text-center"><CircleDashed className={`mx-auto size-6 text-slate-500 ${active ? "animate-spin" : ""}`} /><p className="mt-2 text-sm font-medium">{active ? "Waiting for account discovery" : "No account diagnostics"}</p><p className="mt-1 text-xs text-slate-500">{active ? "Accounts will appear here as Facebook returns them." : "This sync job did not include account-level results."}</p></div>}
      </Card> : <Card className="border-dashed p-8 text-center"><RefreshCw className="mx-auto size-6 text-slate-500" /><h3 className="mt-3 font-semibold">{connected ? "Ready for your first sync" : "Connect Facebook to start syncing"}</h3><p className="mx-auto mt-1 max-w-md text-sm text-slate-400">{connected ? "Sync all accounts to import campaign data and view account-level diagnostics." : "Add and save an access token above. Once connected, account discovery and sync history will appear here."}</p></Card>}

      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><h3 className="font-semibold">Sync history</h3><p className="mt-1 text-xs text-slate-400">Recent full syncs and account retries</p></div>
          <div className="grid gap-2 sm:grid-cols-[minmax(180px,1fr)_130px_130px]">
            <label><span className="sr-only">Search sync history</span><span className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" /><input type="search" className="crm-input pl-9" value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} placeholder="Search history" /></span></label>
            <label><span className="sr-only">Filter sync history by status</span><select className="crm-input" value={historyStatus} onChange={(e) => setHistoryStatus(e.target.value)}><option value="all">All statuses</option><option value="queued">Queued</option><option value="running">Running</option><option value="success">Success</option><option value="partial">Partial</option><option value="failed">Failed</option></select></label>
            <label><span className="sr-only">Filter sync history by kind</span><select className="crm-input" value={historyKind} onChange={(e) => setHistoryKind(e.target.value)}><option value="all">All kinds</option><option value="full">Full sync</option><option value="retry">Account retry</option></select></label>
          </div>
        </div>
        <div className="mt-4 space-y-2">{filteredHistory.length ? filteredHistory.map((item) => {
          const selected = job?.id === item.id;
          return <button key={item.id} type="button" aria-label={`View ${item.kind === "retry" ? "account retry" : "full sync"} from ${formatDate(item.createdAt)}`} aria-pressed={selected} onClick={() => void getFacebookSyncJob(agencyId, item.id).then(setJob)} className={`flex w-full flex-col gap-3 border p-3 text-left transition sm:flex-row sm:items-center sm:justify-between ${selected ? "border-blue-500/50 bg-blue-500/10" : "border-[#20293a] bg-[#101522] hover:border-[#344158]"}`}>
            <span className="flex min-w-0 items-center gap-3"><span className={`h-8 w-1 shrink-0 ${selected ? "bg-blue-400" : "bg-slate-700"}`} /><span className="min-w-0"><span className="block font-medium">{item.kind === "retry" ? "Account retry" : "Full sync"}</span><span className="block truncate text-xs text-slate-500">{formatDate(item.createdAt)}</span></span></span>
            <span className="flex items-center gap-3 sm:justify-end"><span className="text-xs text-slate-400">{item.progress.completed}/{item.progress.total || "?"} complete · {item.progress.succeeded} succeeded</span><StatusBadge tone={statusTone(item.status)}>{item.status}</StatusBadge></span>
          </button>;
        }) : <div className="border border-dashed border-[#2a3549] p-6 text-center"><Clock3 className="mx-auto size-5 text-slate-500" /><p className="mt-2 text-sm font-medium">{historyFiltered ? "No matching sync jobs" : connected ? "No sync history yet" : "No Facebook connection"}</p><p className="mt-1 text-xs text-slate-500">{historyFiltered ? "Try changing your search or filter selections." : connected ? "Completed and failed sync jobs will be listed here." : "Connect Facebook and run a sync to build account history."}</p></div>}</div>
      </Card>
      <div className="flex justify-end"><Button disabled={busy === "save" || !agencyName.trim() || !defaultRate}>{busy === "save" ? "Saving..." : "Save Settings"}</Button></div>
    </>}
  </form>;
}
