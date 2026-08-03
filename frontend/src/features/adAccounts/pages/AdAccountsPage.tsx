import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, CheckCircle2, Download, ExternalLink, Info, RefreshCw,
  Search, Settings2, ShieldAlert, WalletCards, X,
} from "lucide-react";
import { Button } from "../../shared/Button";
import { Card } from "../../shared/Card";
import { StatusBadge } from "../../shared/StatusBadge";
import type { Role } from "../../../types/crm";
import { ApiError } from "../../../lib/api";
import {
  applySpendCap, getAdAccountDetail, getAdAccounts, previewSpendCap,
  type AdAccountDetail, type AdAccountListItem, type SpendCapPreview, type SpendCapResult,
} from "../adAccountsApi";

const GOALS: Record<string, string> = {
  OFFSITE_CONVERSIONS: "Website Purchases", CONVERSATIONS: "Messaging Conversations",
  POST_ENGAGEMENT: "Post Engagement", LINK_CLICKS: "Link Clicks", LEAD_GENERATION: "Lead Generation",
  REACH: "Reach", IMPRESSIONS: "Impressions", MIXED_CBO: "Mixed CBO Goals", UNKNOWN: "Unknown",
};
const labelGoal = (goal: string) => GOALS[goal] || goal.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const humanize = (value: string | null) => value ? value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "—";
const today = () => new Date().toISOString().slice(0, 10);

function formatDecimal(amount: string | null) {
  if (amount === null || amount === "") return "—";
  const match = amount.match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!match) return amount;
  const [, sign, integer, fraction] = match;
  let grouped: string;
  try { grouped = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(BigInt(integer)); }
  catch { grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  return `${sign}${grouped}${fraction ? `.${fraction}` : ""}`;
}
const formatMoney = (amount: string | null, currency: string) => amount === null ? "—" : `${currency} ${formatDecimal(amount)}`;

function formatFetchedAt(value: string) {
  const date = new Date(value);
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const relative = Math.abs(seconds) < 60 ? formatter.format(seconds, "second") : Math.abs(seconds) < 3600 ? formatter.format(Math.round(seconds / 60), "minute") : formatter.format(Math.round(seconds / 3600), "hour");
  return { relative, absolute: date.toLocaleString() };
}

const csvCell = (value: unknown) => {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

function exportCsv(detail: AdAccountDetail) {
  const rows: unknown[][] = [
    ["Section", "Metric", "Value", "Currency"], ["Account", "Name", detail.account.name, ""],
    ["Account", "ID", detail.account.accountId, ""], ["Account", "Status", detail.account.status.label, ""],
    ["Account", "Balance", detail.account.balance.amount, detail.account.currency],
    ["Account", "Lifetime spend", detail.account.lifetimeSpend.amount, detail.account.currency],
    ["Account", "Spending limit", detail.account.spendCap.amount, detail.account.currency],
    ["Period", "Today", detail.periods.today.amount, detail.account.currency],
    ["Period", "Yesterday", detail.periods.yesterday.amount, detail.account.currency],
    ["Period", "MTD", detail.periods.mtd.amount, detail.account.currency],
    ...detail.optimizationSpend.map((row) => ["Optimization spend", labelGoal(row.goal), row.amount, row.currency]),
    ...detail.activeBudget.map((row) => ["Active daily budget", labelGoal(row.goal), row.amount, row.currency]),
    ["Capability", "Funding", detail.capabilities.funding.status, detail.capabilities.funding.reason || ""],
    ["Capability", "Billing", detail.capabilities.billing.status, detail.capabilities.billing.reason],
  ];
  const blob = new Blob(["\uFEFF", rows.map((row) => row.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `ad-account-${detail.account.numericAccountId.replace(/[^0-9]/g, "")}-${detail.selectedDate}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function LoadingSkeleton() {
  return <div className="space-y-4" role="status" aria-label="Loading ad account details">
    <span className="sr-only">Loading ad account details</span>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Card key={index} className="p-5"><div className="crm-skeleton h-3 w-24" /><div className="crm-skeleton mt-4 h-7 w-3/4" /><div className="crm-skeleton mt-3 h-3 w-1/2" /></Card>)}</div>
    <div className="grid gap-4 xl:grid-cols-2">{Array.from({ length: 2 }, (_, index) => <Card key={index} className="p-5"><div className="crm-skeleton h-5 w-48" />{Array.from({ length: 3 }, (_, row) => <div key={row} className="mt-5 flex justify-between"><div className="crm-skeleton h-4 w-1/3" /><div className="crm-skeleton h-4 w-24" /></div>)}</Card>)}</div>
  </div>;
}

function AlertBanner({ tone, children }: { tone: "danger" | "warning" | "info"; children: React.ReactNode }) {
  const styles = tone === "danger" ? "border-red-500/30 bg-red-500/10 text-red-200" : tone === "warning" ? "border-amber-500/30 bg-amber-500/10 text-amber-100" : "border-blue-500/30 bg-blue-500/10 text-blue-100";
  const Icon = tone === "danger" ? ShieldAlert : tone === "warning" ? AlertTriangle : Info;
  return <div role={tone === "danger" ? "alert" : "status"} className={`flex items-start gap-3 rounded-[var(--radius-md)] border p-3.5 text-sm ${styles}`}><Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><div>{children}</div></div>;
}

function AccountSummary({ detail, role, onManage }: { detail: AdAccountDetail; role: Role; onManage: () => void }) {
  const isActive = detail.account.status.label.toLowerCase().includes("active");
  const disableReason = detail.account.disableReason.label !== "NONE" ? humanize(detail.account.disableReason.label) : null;
  const metrics = [
    { label: "Available balance", value: formatMoney(detail.account.balance.amount, detail.account.currency), meta: detail.account.currency },
    { label: "Lifetime spend", value: formatMoney(detail.account.lifetimeSpend.amount, detail.account.currency), meta: "All-time delivery" },
    { label: "Spending limit", value: formatMoney(detail.account.spendCap.amount, detail.account.currency), meta: detail.capabilities.spendCapWrite.status === "available" ? "Editable by admins" : humanize(detail.capabilities.spendCapWrite.reason) },
  ];
  return <section aria-labelledby="account-summary-title">
    <h2 id="account-summary-title" className="sr-only">Account summary</h2>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="p-5" elevated>
        <div className="flex items-start justify-between gap-3"><div className="flex size-10 items-center justify-center rounded-[var(--radius-sm)] bg-blue-500/10 text-blue-300"><WalletCards className="size-5" /></div><StatusBadge tone={isActive ? "success" : "warning"}>{humanize(detail.account.status.label)}</StatusBadge></div>
        <p className="mt-4 truncate text-lg font-semibold">{detail.account.name || "Unnamed account"}</p>
        <p className="mt-1 font-mono text-xs text-slate-400">{detail.account.accountId}</p>
        <p className="mt-3 text-xs text-slate-500">{detail.account.timezoneName}{disableReason ? ` · ${disableReason}` : ""}</p>
      </Card>
      {metrics.map((metric) => <Card key={metric.label} className="flex min-h-40 flex-col justify-between p-5" interactive>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{metric.label}</p>
        <p className="my-4 break-words text-2xl font-semibold tracking-tight text-slate-50">{metric.value}</p>
        <p className="text-xs text-slate-500">{metric.meta}</p>
      </Card>)}
    </div>
    {role === "admin" && detail.capabilities.spendCapWrite.status === "available" && <div className="mt-3 flex justify-end"><Button onClick={onManage}><Settings2 className="size-4" />Manage spending limit</Button></div>}
  </section>;
}

function PeriodSummary({ detail }: { detail: AdAccountDetail }) {
  const periods = [
    { label: "Today", range: detail.periods.today.date, amount: detail.periods.today.amount, featured: true },
    { label: "Yesterday", range: detail.periods.yesterday.date, amount: detail.periods.yesterday.amount },
    { label: "Month to date", range: `${detail.periods.mtd.from} — ${detail.periods.mtd.to}`, amount: detail.periods.mtd.amount },
  ];
  return <section aria-labelledby="period-summary-title"><div className="mb-3"><h2 id="period-summary-title" className="text-base font-semibold">Spend overview</h2><p className="text-xs text-slate-500">Reported in {detail.account.currency}</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{periods.map((period) => <Card key={period.label} className={`p-5 ${period.featured ? "border-blue-400/30 bg-[linear-gradient(145deg,rgba(37,99,235,.16),rgba(13,19,31,.98))]" : ""}`}><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{period.label}</p><p className="mt-3 text-2xl font-semibold tracking-tight">{formatMoney(period.amount, detail.account.currency)}</p><p className="mt-2 text-xs text-slate-500">{period.range}</p></Card>)}</div></section>;
}

interface GoalRow { goal: string; amount: string; currency: string; source?: string }
function GoalTable({ title, caption, rows, exclusions }: { title: string; caption: string; rows: GoalRow[]; exclusions?: number }) {
  return <Card><div className="border-b border-[var(--border)] p-5"><h2 className="font-semibold">{title}</h2>{exclusions ? <p className="mt-1 text-xs text-amber-200/80">{exclusions} lifetime budget entr{exclusions === 1 ? "y" : "ies"} excluded from daily totals.</p> : <p className="mt-1 text-xs text-slate-500">{caption}</p>}</div>{rows.length ? <>
    <div className="grid gap-3 p-3 md:hidden">{rows.map((row, index) => <div key={`${row.goal}-${index}`} className="crm-mobile-card"><div className="flex items-start justify-between gap-3"><StatusBadge>{labelGoal(row.goal)}</StatusBadge><span className="font-mono font-semibold">{formatMoney(row.amount, row.currency)}</span></div><p className="mt-3 text-xs uppercase text-slate-500">Source · {humanize(row.source || "Unavailable")}</p></div>)}</div>
    <div className="hidden overflow-x-auto md:block"><table className="w-full"><caption className="sr-only">{caption}</caption><thead className="crm-table-head"><tr><th scope="col" className="px-4 py-3">Optimization goal</th><th scope="col" className="px-4 py-3">Source</th><th scope="col" className="px-4 py-3 text-right">Amount</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.goal}-${index}`}><th scope="row" className="crm-table-cell text-left font-medium"><StatusBadge>{labelGoal(row.goal)}</StatusBadge></th><td className="crm-table-cell"><span className="rounded-full bg-slate-700/40 px-2 py-1 text-[10px] font-semibold uppercase text-slate-400">{humanize(row.source || "Unavailable")}</span></td><td className="crm-table-cell text-right font-mono font-semibold">{formatMoney(row.amount, row.currency)}</td></tr>)}</tbody></table></div>
  </> : <div className="crm-empty">No data for this selection.</div>}</Card>;
}

function CapabilitiesCard({ detail }: { detail: AdAccountDetail }) {
  const fetched = formatFetchedAt(detail.fetchedAt);
  const capabilities = [
    { label: "Funding", status: detail.capabilities.funding.status, copy: detail.capabilities.funding.displayType || detail.capabilities.funding.reason, suffix: detail.capabilities.funding.last4 ? `•••• ${detail.capabilities.funding.last4}` : null },
    { label: "Billing", status: detail.capabilities.billing.status, copy: detail.capabilities.billing.reason, suffix: null },
  ];
  return <Card className="p-5"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="font-semibold">Funding & billing</h2><p className="mt-1 text-xs text-slate-500">Meta-managed payment and billing capabilities</p></div><StatusBadge tone={detail.stale ? "warning" : "success"}>{detail.stale ? "Stale data" : "Up to date"}</StatusBadge></div>
    <div className="mt-5 grid gap-3 md:grid-cols-2">{capabilities.map((capability) => <div key={capability.label} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-black/10 p-4"><div className="flex items-center justify-between gap-3"><p className="font-medium">{capability.label}</p><StatusBadge tone={capability.status === "available" ? "success" : "default"}>{humanize(capability.status)}</StatusBadge></div><p className="mt-3 text-sm text-slate-300">{humanize(capability.copy)}{capability.suffix ? ` · ${capability.suffix}` : ""}</p></div>)}</div>
    <div className="mt-5 flex flex-col gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between"><div className="text-xs text-slate-500"><p>Fetched <time dateTime={detail.fetchedAt} title={fetched.absolute}>{fetched.relative}</time></p><p className="mt-0.5">{fetched.absolute}</p></div><div className="flex flex-col gap-2 sm:flex-row"><a href={detail.links.billing} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-strong)] px-3 text-sm font-semibold text-slate-200 transition hover:border-blue-400/50">Meta Billing <ExternalLink className="size-3.5" /></a><a href={detail.links.campaigns} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-strong)] px-3 text-sm font-semibold text-slate-200 transition hover:border-blue-400/50">Meta Campaigns <ExternalLink className="size-3.5" /></a></div></div>
  </Card>;
}

function SpendCapDialog({ agencyId, detail, onClose, onApplied }: { agencyId: string; detail: AdAccountDetail; onClose: () => void; onApplied: () => void }) {
  const [operation, setOperation] = useState("set");
  const [amount, setAmount] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [preview, setPreview] = useState<SpendCapPreview | null>(null);
  const [result, setResult] = useState<SpendCapResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const operationRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    operationRef.current?.focus();
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]'));
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", listener);
    return () => { window.removeEventListener("keydown", listener); trigger?.focus(); };
  }, [busy, onClose]);

  const runPreview = async () => {
    setBusy(true); setError("");
    try { setPreview(await previewSpendCap(agencyId, detail.account.accountId, operation, amount)); setResult(null); }
    catch (errorValue) { setError(errorValue instanceof Error ? errorValue.message : "Preview failed"); }
    finally { setBusy(false); }
  };
  const apply = async () => {
    if (!preview) return;
    setBusy(true); setError("");
    try {
      const next = await applySpendCap(agencyId, detail.account.accountId, operation, amount, preview.confirmationToken, crypto.randomUUID());
      setResult(next); onApplied();
    } catch (errorValue) {
      if (errorValue instanceof ApiError && errorValue.status === 409) setPreview(null);
      setError(errorValue instanceof Error ? errorValue.message : "Update failed");
    } finally { setBusy(false); }
  };
  const closeFromBackdrop = (event: React.MouseEvent<HTMLDivElement>) => { if (event.target === event.currentTarget && !busy) onClose(); };
  const destructive = operation === "reduce";

  return <div className="crm-overlay fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-3 backdrop-blur-sm sm:p-6" onMouseDown={closeFromBackdrop}>
    <div ref={dialogRef} className="crm-dialog my-auto w-full max-w-xl overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface)] shadow-[var(--shadow-lg)]" role="dialog" aria-modal="true" aria-labelledby="spend-cap-title" aria-describedby="spend-cap-description" aria-busy={busy}>
      <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] p-5"><div><h2 id="spend-cap-title" className="text-lg font-semibold">Manage spending limit</h2><p id="spend-cap-description" className="mt-1 text-sm text-slate-400">{detail.account.name} · {detail.account.accountId}</p></div><button className="crm-icon-button shrink-0" onClick={onClose} disabled={busy} aria-label="Close dialog"><X className="size-4" /></button></div>
      <div className="max-h-[calc(100vh-10rem)] overflow-y-auto p-5">
        {!result && <ol className="mb-5 grid grid-cols-2 gap-2" aria-label="Update progress"><li className={`rounded-lg border p-2 text-center text-xs font-semibold ${!preview ? "border-blue-400/40 bg-blue-500/10 text-blue-200" : "border-emerald-500/30 text-emerald-300"}`}>1. Configure</li><li className={`rounded-lg border p-2 text-center text-xs font-semibold ${preview ? "border-blue-400/40 bg-blue-500/10 text-blue-200" : "border-[var(--border)] text-slate-500"}`}>2. Confirm</li></ol>}
        {error && <div role="alert" className="mb-4 rounded-[var(--radius-sm)] border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}{!preview && <span className="mt-1 block text-xs text-red-200/70">Review the latest account value and preview again.</span>}</div>}
        {result ? <div className="text-center"><CheckCircle2 className="mx-auto size-10 text-emerald-400" /><h3 className="mt-3 text-lg font-semibold text-emerald-300">Spending limit updated</h3><p className="mt-1 text-sm text-slate-400">Verified by Meta</p><div className="mt-5 grid grid-cols-2 gap-3 rounded-[var(--radius-md)] border border-emerald-500/20 bg-emerald-500/5 p-4 text-left"><div><span className="text-xs text-slate-500">Previous</span><p className="mt-1 font-mono">{formatMoney(result.old, result.currency)}</p></div><div><span className="text-xs text-slate-500">New limit</span><p className="mt-1 font-mono font-semibold">{formatMoney(result.target, result.currency)}</p></div><div className="col-span-2 text-xs text-slate-500">Applied {new Date(result.appliedAt).toLocaleString()}</div></div><Button className="mt-5 w-full sm:w-auto" onClick={onClose}>Close</Button></div> : <div className="space-y-4">
          {destructive && <div className="flex gap-3 rounded-[var(--radius-sm)] border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><p>Reducing this limit can pause delivery when the target is reached. Review the target carefully.</p></div>}
          <label className="block text-sm"><span className="crm-label">Operation</span><select ref={operationRef} className="crm-input" value={operation} onChange={(event) => { setOperation(event.target.value); setPreview(null); setConfirmation(""); }}><option value="set">Set absolute limit</option><option value="add">Add to current limit</option><option value="reduce">Reduce current limit</option></select></label>
          <label className="block text-sm"><span className="crm-label">Amount ({detail.account.currency})</span><input className="crm-input" inputMode="decimal" value={amount} onChange={(event) => { setAmount(event.target.value); setPreview(null); setConfirmation(""); }} placeholder="1000.00" aria-describedby="amount-help" /><span id="amount-help" className="mt-1.5 block text-xs text-slate-500">Current limit: {formatMoney(detail.account.spendCap.amount, detail.account.currency)}</span></label>
          {preview && <div className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-black/10 p-4 sm:grid-cols-3"><div><span className="text-xs text-slate-500">Current</span><p className="mt-1 font-mono">{formatMoney(preview.current, preview.currency)}</p></div><div><span className="text-xs text-slate-500">Change</span><p className={destructive ? "mt-1 font-mono text-red-300" : "mt-1 font-mono"}>{formatMoney(preview.change, preview.currency)}</p></div><div><span className="text-xs text-slate-500">Target</span><p className="mt-1 font-mono font-semibold text-blue-200">{formatMoney(preview.target, preview.currency)}</p></div></div>}
          {preview && <label className="block text-sm"><span className="crm-label normal-case">Type <strong className="font-mono text-slate-200">{detail.account.accountId}</strong> to confirm</span><input className="crm-input" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" spellCheck={false} /></label>}
          <div className="flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>{preview ? <Button variant={destructive ? "danger" : "primary"} onClick={() => void apply()} disabled={busy || confirmation !== detail.account.accountId}>{busy ? "Applying…" : destructive ? "Reduce limit" : "Apply limit"}</Button> : <Button onClick={() => void runPreview()} disabled={busy || !amount}>{busy ? "Checking…" : "Preview change"}</Button>}</div>
        </div>}
      </div>
    </div>
  </div>;
}

export function AdAccountsPage({ agencyId, role }: { agencyId: string; role: Role }) {
  const [accounts, setAccounts] = useState<AdAccountListItem[]>([]);
  const [selected, setSelected] = useState("");
  const [date, setDate] = useState(today());
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<AdAccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const request = useRef(0);

  useEffect(() => {
    setAccountsLoading(true);
    setError("");
    void getAdAccounts(agencyId)
      .then((rows) => { setAccounts(rows); setSelected((current) => current || rows[0]?.accountId || ""); setLoading(rows.length > 0); })
      .catch((errorValue) => { setError(errorValue instanceof Error ? errorValue.message : "Could not load accounts"); setLoading(false); })
      .finally(() => setAccountsLoading(false));
  }, [agencyId]);

  const load = async (refresh = false) => {
    if (!selected) { setLoading(false); return; }
    const id = ++request.current;
    setLoading(true); setError("");
    try { const value = await getAdAccountDetail(agencyId, selected, date, refresh); if (request.current === id) setDetail(value); }
    catch (errorValue) { if (request.current === id) setError(errorValue instanceof ApiError ? errorValue.message : "Could not load ad account"); }
    finally { if (request.current === id) setLoading(false); }
  };
  useEffect(() => { void load(); return () => { request.current += 1; }; }, [selected, date, agencyId]);
  const filtered = useMemo(() => accounts.filter((row) => `${row.name} ${row.accountId}`.toLowerCase().includes(search.trim().toLowerCase())), [accounts, search]);

  return <div className="crm-page-shell" aria-busy={loading}>
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="crm-page-title">Ad Accounts</h2><StatusBadge tone="success"><span className="mr-1.5 size-1.5 rounded-full bg-emerald-400" />Live</StatusBadge><span className="text-xs text-slate-500">{accounts.length} account{accounts.length === 1 ? "" : "s"}</span></div><p className="crm-page-subtitle">Account-level spend, budgets, funding, and controls</p></div><div className="grid grid-cols-2 gap-2 sm:flex"><Button variant="secondary" onClick={() => void load(true)} disabled={loading || !selected} aria-label="Refresh account data"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button><Button variant="secondary" onClick={() => detail && exportCsv(detail)} disabled={!detail}><Download className="size-4" />Export CSV</Button></div></header>

    <Card className="crm-glass-toolbar sticky top-16 z-20 grid gap-3 p-3 sm:p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
      <label className="relative"><span className="sr-only">Search ad accounts</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" /><input className="crm-input pl-9" placeholder="Search name or ID" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      <label><span className="sr-only">Select ad account</span><select className="crm-input" value={selected} onChange={(event) => setSelected(event.target.value)}>{filtered.length ? filtered.map((row) => <option key={row.accountId} value={row.accountId}>{row.name || "Unnamed"} · {row.accountId}</option>) : <option value="">No matching accounts</option>}</select></label>
      <label><span className="sr-only">Selected date</span><input className="crm-input min-w-36" type="date" max={today()} value={date} onChange={(event) => setDate(event.target.value)} /></label>
    </Card>

    {error && <AlertBanner tone="danger">{error}</AlertBanner>}
    {!accounts.length && !accountsLoading && <Card className="crm-empty"><WalletCards className="size-8 text-slate-500" /><div><p className="font-semibold text-slate-200">No ad accounts connected</p><p className="mt-1">Connect Meta in Settings to start viewing account activity.</p></div><a href="/settings" className="crm-focus-ring mt-2 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] bg-blue-600 px-4 font-semibold text-white transition hover:bg-blue-500">Open Settings</a></Card>}
    {detail?.stale && <AlertBanner tone="warning">Showing cached data because Meta is currently unavailable. Values may be out of date.</AlertBanner>}
    {detail?.partialErrors.map((item, index) => <AlertBanner key={`${item.category}-${index}`} tone="warning"><strong>{humanize(item.category)}:</strong> {item.message}</AlertBanner>)}

    {loading && detail && <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden bg-blue-950" role="progressbar" aria-label="Refreshing account data"><div className="h-full w-1/3 animate-[crm-progress_1.2s_ease-in-out_infinite] rounded-full bg-blue-400" /></div>}
    {loading && !detail && <LoadingSkeleton />}
    {detail && <div className="space-y-6">
      <AccountSummary detail={detail} role={role} onManage={() => setModal(true)} />
      <PeriodSummary detail={detail} />
      <div className="grid gap-4 xl:grid-cols-2"><GoalTable title="Spend by optimization goal" caption={`Optimization spend for ${detail.selectedDate}`} rows={detail.optimizationSpend} /><GoalTable title="Active daily budget by goal" caption="Active daily budgets grouped by optimization goal" rows={detail.activeBudget} exclusions={detail.budgetExclusions?.lifetimeBudgetCount} /></div>
      <CapabilitiesCard detail={detail} />
    </div>}
    <div className="sr-only" role="status" aria-live="polite">{loading ? "Refreshing ad account data" : detail ? `Showing ${detail.account.name}` : ""}</div>
    {modal && detail && <SpendCapDialog agencyId={agencyId} detail={detail} onClose={() => setModal(false)} onApplied={() => void load(true)} />}
  </div>;
}
