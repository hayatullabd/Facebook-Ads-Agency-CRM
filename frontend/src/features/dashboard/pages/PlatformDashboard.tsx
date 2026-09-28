import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Building2, CalendarClock, CheckCircle2, CircleDollarSign, Clock3, Plus, Repeat, ShieldAlert, Trash2, X } from "lucide-react";
import { Link } from "react-router";
import { formatDate, formatMoney } from "../../../lib/formatters";
import { Card } from "../../shared/Card";
import { StatusBadge } from "../../shared/StatusBadge";
import { createPlatformInvoice, deletePlatformInvoice, getPlatformInvoices, getSubscriptionPlans, markPlatformInvoicePaid, type PlatformInvoice, type SubscriptionPlan } from "../../subscriptions/subscriptionsApi";
import { createWorkspace, decideWorkspace, deleteWorkspace, getPlatformDashboard, type PlatformDashboard as PlatformDashboardData, type PlatformWorkspace } from "../platformDashboardApi";

const moneyMap = (totals: Record<string, number>) => {
  const entries = Object.entries(totals);
  return entries.length ? entries.map(([currency, amount]) => formatMoney(amount, currency)).join(" · ") : formatMoney(0, "USD");
};

const subscriptionTone = (status: string) => status === "active" ? "success" : status === "past_due" || status === "expired" ? "danger" : "warning";

function WorkspaceRow({ workspace, actions }: { workspace: PlatformWorkspace; actions?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800">{workspace.name}</p>
        <p className="mt-0.5 truncate text-xs text-slate-500">{workspace.ownerName}{workspace.ownerEmail ? ` · ${workspace.ownerEmail}` : ""}</p>
      </div>
      <div className="hidden text-right sm:block">
        <p className="text-xs font-medium text-slate-700">{workspace.planName}</p>
        <p className="mt-0.5 text-[11px] text-slate-400">{workspace.renewalAt ? `Renews ${formatDate(workspace.renewalAt)}` : formatDate(workspace.createdAt)}</p>
      </div>
      {actions}
    </div>
  );
}

export function PlatformDashboard() {
  const [data, setData] = useState<PlatformDashboardData | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [adding, setAdding] = useState(false);
  const [tab, setTab] = useState<"overview" | "agencies" | "billing">("overview");
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [invoices, setInvoices] = useState<PlatformInvoice[]>([]);
  const [billForm, setBillForm] = useState({ agency: "", amount: "", currency: "BDT" as PlatformInvoice["currency"], dueDate: "", note: "" });
  const [confirmInvoiceId, setConfirmInvoiceId] = useState("");
  const [removing, setRemoving] = useState<PlatformWorkspace | null>(null);
  const [form, setForm] = useState({ agencyName: "", name: "", email: "", password: "", plan: "" });

  const load = useCallback(async () => {
    const [next, invoiceList] = await Promise.all([getPlatformDashboard(), getPlatformInvoices()]);
    setData(next);
    setInvoices(invoiceList);
    setError("");
  }, []);

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : "Could not load the SaaS dashboard"));
  }, [load]);

  useEffect(() => {
    if (!adding) return;
    void getSubscriptionPlans().then(setPlans).catch((err) => setError(err instanceof Error ? err.message : "Could not load plans"));
  }, [adding]);

  const addAgency = async (event: FormEvent) => {
    event.preventDefault();
    setBusy("create");
    setError("");
    setNotice("");
    try {
      await createWorkspace(form);
      const planName = plans.find((plan) => plan._id === form.plan)?.name || "the selected plan";
      setNotice(`${form.agencyName.trim()} is ready on ${planName}. ${form.email.trim()} can sign in now.`);
      setForm({ agencyName: "", name: "", email: "", password: "", plan: "" });
      setAdding(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the agency");
    } finally {
      setBusy("");
    }
  };

  const agencies = data?.agencies || [];
  const fillBill = (agencyId: string) => {
    const match = agencies.find((item) => item._id === agencyId);
    setTab("billing");
    setBillForm((current) => ({
      ...current,
      agency: agencyId,
      amount: match?.planPrice == null ? current.amount : String(match.planPrice),
      currency: (match?.planCurrency as PlatformInvoice["currency"]) || current.currency,
      dueDate: current.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    }));
  };
  const saveInvoice = async (event: FormEvent) => {
    event.preventDefault();
    setBusy("invoice");
    setError("");
    try {
      await createPlatformInvoice({ agency: billForm.agency, amount: Number(billForm.amount), currency: billForm.currency, dueDate: billForm.dueDate, note: billForm.note.trim() });
      setBillForm({ agency: "", amount: "", currency: billForm.currency, dueDate: "", note: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the invoice");
    } finally {
      setBusy("");
    }
  };
  const collectInvoice = async (action: () => Promise<unknown>) => {
    setBusy("invoice");
    setError("");
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the invoice");
    } finally {
      setBusy("");
    }
  };

  const removeAgency = async () => {
    if (!removing) return;
    setBusy("delete");
    setError("");
    setNotice("");
    try {
      await deleteWorkspace(removing._id);
      setNotice(`${removing.name} and its logins, clients, campaigns, and payments were deleted.`);
      setRemoving(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the agency");
    } finally {
      setBusy("");
    }
  };

  const decide = async (workspace: PlatformWorkspace, decision: "approve" | "reject") => {
    setBusy(workspace._id);
    setError("");
    try {
      await decideWorkspace(workspace._id, decision);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the workspace");
    } finally {
      setBusy("");
    }
  };

  const kpis = data ? [
    { label: "Active workspaces", value: String(data.kpis.activeWorkspaces), meta: `${data.kpis.pendingWorkspaces} waiting for approval`, icon: Building2, tone: "bg-blue-50 text-blue-700" },
    { label: "Active subscriptions", value: String(data.kpis.activeSubscriptions), meta: `${data.kpis.trialingSubscriptions} on trial`, icon: Repeat, tone: "bg-emerald-50 text-emerald-700" },
    { label: "Monthly revenue", value: moneyMap(data.kpis.mrr), meta: `${data.kpis.plans} active plans`, icon: CircleDollarSign, tone: "bg-amber-50 text-amber-700" },
    { label: "Needs billing", value: String(data.kpis.pastDueSubscriptions), meta: `${data.kpis.suspendedWorkspaces} suspended or rejected`, icon: ShieldAlert, tone: "bg-rose-50 text-rose-700" },
  ] : [];

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "agencies" as const, label: "Agencies" },
    { id: "billing" as const, label: "Billing" },
  ];

  return (
    <div className="space-y-3 text-slate-900">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">SaaS owner</p>
          <h2 className="text-lg font-semibold text-slate-900">Platform overview</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded border border-slate-200 bg-slate-100 p-0.5">
            {tabs.map((item) => <button key={item.id} type="button" aria-pressed={tab === item.id} className={`rounded px-3 py-1.5 text-xs font-semibold ${tab === item.id ? "bg-white text-[#1d4ed8] shadow-sm" : "text-slate-600 hover:text-slate-900"}`} onClick={() => setTab(item.id)}>{item.label}</button>)}
          </div>
          {tab === "agencies" && <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded bg-[#1d4ed8] px-3 text-xs font-semibold text-white hover:bg-[#1e40af]" onClick={() => { setAdding(true); setError(""); }}><Plus className="size-3.5" />Add agency</button>}
          {tab === "overview" && <Link to="/subscriptions" className="inline-flex h-8 items-center rounded border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">Manage plans</Link>}
        </div>
      </header>

      {error && !adding && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}

      {tab === "overview" && <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, meta, icon: Icon, tone }) => (
          <Card key={label} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon className="size-4" /></div>
            </div>
            <p className={`mt-4 font-semibold tracking-tight text-slate-900 ${value.length > 16 ? "text-lg" : "text-2xl"}`}>{value}</p>
            <p className="mt-2 text-xs text-slate-500">{meta}</p>
          </Card>
        ))}
        {!data && !error && <Card className="p-5 text-sm text-slate-500 sm:col-span-2 xl:col-span-4">Loading platform overview...</Card>}
      </section>}

      {tab === "overview" && <section className="grid gap-3 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900">Pending agencies</h3>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">{data?.pending.length || 0}</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">New workspaces waiting for a decision</p>
            </div>
          </div>
          {data && data.pending.length ? (
            <div className="divide-y divide-slate-100">
              {data.pending.map((workspace) => (
                <WorkspaceRow key={workspace._id} workspace={workspace} actions={
                  <div className="flex shrink-0 gap-1.5">
                    <button type="button" disabled={busy === workspace._id} className="rounded-lg bg-[#1d4ed8] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1e40af] disabled:opacity-50" onClick={() => void decide(workspace, "approve")}>Approve</button>
                    <button type="button" disabled={busy === workspace._id} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50" onClick={() => void decide(workspace, "reject")}>Reject</button>
                  </div>
                } />
              ))}
            </div>
          ) : data ? (
            <div className="flex items-center gap-3 px-5 py-10 text-sm text-slate-500"><CheckCircle2 className="size-5 text-emerald-600" />No agencies are waiting for approval.</div>
          ) : null}
        </Card>

        <Card className="xl:col-span-2">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-base font-semibold text-slate-900">Billing watch</h3>
            <p className="mt-1 text-sm text-slate-500">Past due plans and renewals in the next 14 days</p>
          </div>
          <div className="divide-y divide-slate-100">
            {data?.attention.map((workspace) => (
              <div key={workspace._id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-700"><ShieldAlert className="size-4" /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{workspace.name}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{workspace.planName}</p>
                </div>
                <StatusBadge tone={subscriptionTone(workspace.subscriptionStatus)}>{workspace.subscriptionStatus.replace("_", " ")}</StatusBadge>
              </div>
            ))}
            {data?.renewals.map((workspace) => (
              <div key={`renewal-${workspace._id}`} className="flex items-center gap-3 px-5 py-3.5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><CalendarClock className="size-4" /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{workspace.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">Renews {formatDate(workspace.renewalAt || "")}</p>
                </div>
                <span className="text-sm font-semibold text-slate-800">{workspace.planPrice == null ? "—" : formatMoney(workspace.planPrice, workspace.planCurrency)}</span>
              </div>
            ))}
            {data && !data.attention.length && !data.renewals.length && (
              <div className="flex items-center gap-3 px-5 py-10 text-sm text-slate-500"><Clock3 className="size-5 text-slate-400" />No renewals or failed payments in this window.</div>
            )}
          </div>
        </Card>
      </section>}

      {tab === "agencies" && <section className="overflow-hidden rounded border border-slate-200 bg-white">
        <div className="overflow-x-auto"><table className="crm-compact-table min-w-[820px]"><thead className="crm-table-head"><tr><th>Agency</th><th>Owner</th><th>Plan</th><th>Clients</th><th>Status</th><th>Joined</th><th className="text-right">Actions</th></tr></thead><tbody>{agencies.length ? agencies.map((item) => <tr key={item._id}><td className="crm-table-cell font-semibold text-slate-800">{item.name}</td><td className="crm-table-cell"><p>{item.ownerName}</p><p className="text-[11px] text-slate-500">{item.ownerEmail}</p></td><td className="crm-table-cell">{item.planName}{item.planPrice == null ? "" : ` · ${formatMoney(item.planPrice, item.planCurrency)}`}</td><td className="crm-table-cell">{(item.clientLimit || 0) > 0 ? `${item.clientCount || 0} / ${item.clientLimit}` : item.clientCount || 0}</td><td className="crm-table-cell"><StatusBadge tone={subscriptionTone(item.subscriptionStatus)}>{item.subscriptionStatus.replace("_", " ")}</StatusBadge></td><td className="crm-table-cell text-slate-500">{formatDate(item.createdAt)}</td><td className="crm-table-cell text-right"><div className="flex justify-end gap-1"><button type="button" className="rounded border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50" onClick={() => fillBill(item._id)}>Bill</button><button type="button" className="crm-icon-button text-rose-700" aria-label={`Delete ${item.name}`} onClick={() => { setRemoving(item); setError(""); }}><Trash2 className="size-3.5" /></button></div></td></tr>) : <tr><td className="crm-table-cell text-slate-500" colSpan={7}>{data ? "No agencies yet." : "Loading agencies..."}</td></tr>}</tbody></table></div>
      </section>}

      {tab === "billing" && <section className="overflow-hidden rounded border border-slate-200 bg-white">
        <form className="grid gap-2 border-b border-slate-200 p-2 sm:grid-cols-2 xl:grid-cols-[minmax(10rem,1.2fr)_6.5rem_6rem_8rem_minmax(8rem,1fr)_auto] xl:items-end" onSubmit={saveInvoice}>
          <label><span className="crm-label">Agency</span><select required className="crm-input" value={billForm.agency} onChange={(event) => fillBill(event.target.value)}><option value="">Select agency</option>{agencies.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>
          <label><span className="crm-label">Amount</span><input required min="0" step="0.01" type="number" className="crm-input" value={billForm.amount} onChange={(event) => setBillForm((current) => ({ ...current, amount: event.target.value }))} /></label>
          <label><span className="crm-label">Currency</span><select className="crm-input" value={billForm.currency} onChange={(event) => setBillForm((current) => ({ ...current, currency: event.target.value as PlatformInvoice["currency"] }))}><option>USD</option><option>BDT</option><option>INR</option></select></label>
          <label><span className="crm-label">Due date</span><input required type="date" className="crm-input" value={billForm.dueDate} onChange={(event) => setBillForm((current) => ({ ...current, dueDate: event.target.value }))} /></label>
          <label><span className="crm-label">Note</span><input maxLength={300} className="crm-input" value={billForm.note} onChange={(event) => setBillForm((current) => ({ ...current, note: event.target.value }))} placeholder="Monthly plan" /></label>
          <button disabled={busy === "invoice" || !agencies.length} className="h-8 rounded bg-[#1d4ed8] px-2.5 text-xs font-semibold text-white hover:bg-[#1e40af] disabled:opacity-50">{busy === "invoice" ? "Saving..." : "Create invoice"}</button>
        </form>
        <div className="overflow-x-auto"><table className="crm-compact-table min-w-[720px]"><thead className="crm-table-head"><tr><th>Invoice</th><th>Agency</th><th>Amount</th><th>Due</th><th>Status</th><th className="text-right">Collect</th></tr></thead><tbody>{invoices.length ? invoices.map((invoice) => <tr key={invoice._id}><td className="crm-table-cell font-semibold text-slate-800">{invoice.invoiceNumber}</td><td className="crm-table-cell">{invoice.agencyName}</td><td className="crm-table-cell">{formatMoney(invoice.amount, invoice.currency)}</td><td className="crm-table-cell">{formatDate(invoice.dueDate)}</td><td className="crm-table-cell"><StatusBadge tone={invoice.status === "Paid" ? "success" : invoice.status === "Overdue" ? "danger" : "warning"}>{invoice.status}</StatusBadge></td><td className="crm-table-cell"><div className="flex justify-end gap-1">{invoice.status !== "Paid" && <button type="button" disabled={busy === "invoice"} className="rounded bg-[#1d4ed8] px-2 py-1 text-[11px] font-semibold text-white hover:bg-[#1e40af] disabled:opacity-50" onClick={() => void collectInvoice(() => markPlatformInvoicePaid(invoice._id))}>Mark paid</button>}{confirmInvoiceId === invoice._id ? <><button type="button" disabled={busy === "invoice"} className="rounded bg-rose-600 px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-50" onClick={() => void collectInvoice(async () => { await deletePlatformInvoice(invoice._id); setConfirmInvoiceId(""); })}>Delete</button><button type="button" className="rounded border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700" onClick={() => setConfirmInvoiceId("")}>Cancel</button></> : <button type="button" className="crm-icon-button text-rose-700" aria-label={`Delete ${invoice.invoiceNumber}`} onClick={() => setConfirmInvoiceId(invoice._id)}><Trash2 className="size-3.5" /></button>}</div></td></tr>) : <tr><td className="crm-table-cell text-slate-500" colSpan={6}>No agency invoices yet.</td></tr>}</tbody></table></div>
      </section>}

      {removing && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4">
        <Card className="w-full max-w-md p-5">
          <h3 className="text-lg font-semibold text-slate-900">Delete {removing.name}?</h3>
          <p className="mt-2 text-sm text-slate-600">This removes the agency, its owner login, team, clients, campaigns, invoices, and payments. Subscription plans stay. This cannot be undone.</p>
          {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => { setRemoving(null); setError(""); }}>Cancel</button>
            <button type="button" disabled={busy === "delete"} className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50" onClick={() => void removeAgency()}>{busy === "delete" ? "Deleting..." : "Delete agency"}</button>
          </div>
        </Card>
      </div>}

      {adding && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4">
        <Card className="w-full max-w-lg p-5">
          <form onSubmit={addAgency} className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Add agency</h3>
                <p className="mt-1 text-sm text-slate-500">Create the workspace and the owner login.</p>
              </div>
              <button type="button" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100" aria-label="Close" onClick={() => setAdding(false)}><X className="size-4" /></button>
            </div>
            <label className="block"><span className="crm-label">Agency name</span><input required minLength={2} maxLength={120} className="crm-input" value={form.agencyName} onChange={(event) => setForm((current) => ({ ...current, agencyName: event.target.value }))} /></label>
            <label className="block"><span className="crm-label">Owner name</span><input required minLength={2} maxLength={100} className="crm-input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label>
            <label className="block"><span className="crm-label">Owner email</span><input required type="email" className="crm-input" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label>
            <label className="block"><span className="crm-label">Temporary password</span><input required minLength={12} type="password" autoComplete="new-password" className="crm-input" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} /><p className="mt-1 text-xs text-slate-500">12+ characters with uppercase, lowercase, a number, and a special character.</p></label>
            <label className="block"><span className="crm-label">Subscription plan</span><select required className="crm-input" value={form.plan} onChange={(event) => setForm((current) => ({ ...current, plan: event.target.value }))}><option value="">Select a plan</option>{plans.map((plan) => <option key={plan._id} value={plan._id}>{plan.name} · {formatMoney(plan.price, plan.currency)} / month · {(plan.limits?.clients || 0) > 0 ? `${plan.limits?.clients} clients` : "Unlimited clients"}</option>)}</select>{!plans.length && <p className="mt-1 text-xs text-slate-500">No plans yet. <Link to="/subscriptions" className="font-semibold text-[#1d4ed8]" onClick={() => setAdding(false)}>Create a plan</Link>, then add the agency.</p>}</label>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => setAdding(false)}>Cancel</button>
              <button disabled={busy === "create" || !plans.length} className="rounded-lg bg-[#1d4ed8] px-3 py-2 text-sm font-semibold text-white hover:bg-[#1e40af] disabled:opacity-50">{busy === "create" ? "Adding..." : "Add agency"}</button>
            </div>
          </form>
        </Card>
      </div>}
    </div>
  );
}
