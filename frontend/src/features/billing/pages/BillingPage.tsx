import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CircleDollarSign, Clock3, Download, Eye, Filter, Pencil, Plus, ReceiptText, Search, Trash2, WalletCards, X } from "lucide-react";
import type { AdRequest, Client, Invoice, InvoiceStatus, Role } from "../../../types/crm";
import type { CreateInvoicePayload, UpdateInvoicePayload } from "../billingApi";
import { formatDate, formatMoney } from "../../../lib/formatters";
import { isAgencyStaff } from "../../../lib/permissions";
import { Button } from "../../shared/Button";
import { Card } from "../../shared/Card";
import { StatusBadge } from "../../shared/StatusBadge";
import { getInvoiceDownloadUrl } from "../billingApi";
import { AdvancePaymentDialog } from "../AdvancePaymentDialog";
import { getPaymentAccounts, type PaymentAccount } from "../paymentApi";

const invoiceStatuses: InvoiceStatus[] = ["Unpaid", "Partial", "Paid", "Overdue"];
const editableStatuses: InvoiceStatus[] = ["Unpaid", "Partial", "Paid", "Overdue"];
const totals = (items: Invoice[], fallbackCurrency = "USD") => {
  const map = new Map<string, number>();
  items.forEach((item) => map.set(item.currency, (map.get(item.currency) || 0) + item.amount));
  return map.size ? [...map].map(([currency, amount]) => formatMoney(amount, currency)).join(" · ") : formatMoney(0, fallbackCurrency);
};

type Props = {
  invoices: Invoice[];
  clients: Client[];
  requests: AdRequest[];
  role: Role;
  currentClientId?: string | null;
  agencyId: string;
  onCreateInvoice: (payload: CreateInvoicePayload) => Promise<void>;
  onUpdateInvoice: (id: string, payload: UpdateInvoicePayload) => Promise<void>;
  onDeleteInvoice: (id: string) => Promise<void>;
  onMarkPaid: (id: string) => Promise<void>;
  onRecordAdvance: (payload: { client: string; amount: number; currency: string; method: string; reference?: string; description?: string; transactionDate?: string; screenshot?: string }) => Promise<void>;
  onApplyAdvance: (invoiceId: string, amount?: number) => Promise<void>;
};

export function BillingPage({ invoices, clients, requests, role, currentClientId, agencyId, onCreateInvoice, onUpdateInvoice, onDeleteInvoice, onMarkPaid, onRecordAdvance, onApplyAdvance }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState("all");
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [client, setClient] = useState("");
  const [adRequest, setAdRequest] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [correctionAmount, setCorrectionAmount] = useState("");
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus>("Unpaid");
  const [notes, setNotes] = useState("");
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [partialInvoice, setPartialInvoice] = useState<Invoice | null>(null);
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);

  const canManage = isAgencyStaff(role);
  const canPay = canManage || role === "client";
  const matchingRequests = useMemo(
    () => requests.filter((item) => item.client?._id === client && ["Approved", "Live"].includes(item.status)),
    [requests, client],
  );
  const selectedRequest = useMemo(() => matchingRequests.find((item) => item._id === adRequest), [matchingRequests, adRequest]);
  const selectedClient = useMemo(() => clients.find((item) => item._id === client), [clients, client]);
  const calculatedAmount = selectedRequest && selectedClient
    ? selectedRequest.budget.type === "daily"
      ? selectedRequest.budget.amount * selectedRequest.durationDays * selectedClient.billingRate
      : selectedRequest.budget.amount * selectedClient.billingRate
    : 0;
  const currencies = useMemo(() => [...new Set(invoices.map((item) => item.currency))].sort(), [invoices]);
  const filtered = useMemo(
    () => invoices.filter((item) =>
      (!search.trim() || [item.invoiceNumber, item.pageName, item.objective, item.client?.name].some((value) => value?.toLowerCase().includes(search.toLowerCase())))
      && (statusFilter === "all" || item.status === statusFilter)
      && (clientFilter === "all" || item.client?._id === clientFilter)
      && (currencyFilter === "all" || item.currency === currencyFilter)),
    [invoices, search, statusFilter, clientFilter, currencyFilter],
  );

  const close = () => { setOpen(false); setEditing(null); setError(""); };
  const startCreate = () => {
    setEditing(null);
    setClient("");
    setAdRequest("");
    setDueDate("");
    setInvoiceStatus("Unpaid");
    setNotes("");
    setDiscountAmount("");
    setCorrectionAmount("");
    setError("");
    setOpen(true);
  };
  const startEdit = (item: Invoice) => {
    setEditing(item);
    setDueDate(item.dueDate.slice(0, 10));
    setInvoiceStatus(item.status);
    setNotes(item.notes || "");
    setDiscountAmount(String((item as Invoice & { discountAmount?: number }).discountAmount ?? ""));
    setCorrectionAmount(String((item as Invoice & { correctionAmount?: number }).correctionAmount ?? ""));
    setError("");
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [open]);

  useEffect(() => {
    let active = true;
    getPaymentAccounts(agencyId).then((next) => { if (active) setAccounts(next); }).catch(() => undefined);
    return () => { active = false; };
  }, [agencyId, invoices]);

  const advanceBalance = (clientId?: string, currency?: string) => accounts
    .filter((account) => account.name.startsWith("Advance") && account.client?._id === clientId && account.currency === currency)
    .reduce((sum, account) => sum + account.balance, 0);
  const advanceAccounts = accounts.filter((account) => account.name.startsWith("Advance") && account.balance > 0);

  const run = async (key: string, action: () => Promise<void>, fallback: string) => {
    setBusy(key);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback);
      throw err;
    } finally {
      setBusy("");
    }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      if (editing) {
        await run("form", () => onUpdateInvoice(editing._id, { status: invoiceStatus, dueDate, notes, discountAmount: discountAmount === "" ? undefined : Number(discountAmount), correctionAmount: correctionAmount === "" ? undefined : Number(correctionAmount) }), "Could not update invoice");
      } else {
        await run("form", () => onCreateInvoice({ client, adRequest, dueDate, discountAmount: discountAmount === "" ? undefined : Number(discountAmount), correctionAmount: correctionAmount === "" ? undefined : Number(correctionAmount) }), "Could not create invoice");
      }
      close();
    } catch { /* surfaced */ }
  };
  const openAdvance = () => { setError(""); setPartialInvoice(null); setAdvanceOpen(true); };
  const applyAdvance = async (item: Invoice) => {
    const due = Math.max(0, item.amount - (item.paidAmount || 0));
    const available = advanceBalance(item.client?._id, item.currency);
    const applied = Math.min(due, available);
    if (applied <= 0) return;
    if (!window.confirm(`Apply ${formatMoney(applied, item.currency)} advance to ${item.invoiceNumber}?`)) return;
    try {
      await run(`advance-${item._id}`, () => onApplyAdvance(item._id), "Could not apply advance");
    } catch { /* surfaced */ }
  };
  const remove = async (item: Invoice) => {
    if (!window.confirm(`Delete invoice ${item.invoiceNumber}? This cannot be undone.`)) return;
    try {
      await run(`delete-${item._id}`, () => onDeleteInvoice(item._id), "Could not delete invoice");
    } catch { /* surfaced */ }
  };
  const openInvoiceView = (item: Invoice) => setEditing(item);

  const currency = invoices[0]?.currency || "USD";
  const moneyBy = (pick: (item: Invoice) => number) => {
    const map = new Map<string, number>();
    invoices.forEach((item) => {
      const amount = pick(item);
      if (amount) map.set(item.currency, (map.get(item.currency) || 0) + amount);
    });
    return map.size ? [...map].map(([code, amount]) => formatMoney(amount, code)).join(" · ") : formatMoney(0, currency);
  };
  const paidInvoices = invoices.filter((item) => item.status === "Paid");
  const openInvoices = invoices.filter((item) => item.status !== "Paid");
  const overdueInvoices = invoices.filter((item) => item.status === "Overdue");
  const kpis = [
    { label: "Total billed", value: totals(invoices, currency), meta: `${invoices.length} invoice${invoices.length === 1 ? "" : "s"}`, icon: ReceiptText, tone: "bg-blue-50 text-blue-700" },
    { label: "Collected", value: moneyBy((item) => item.status === "Paid" ? item.amount : (item.paidAmount || 0)), meta: `${paidInvoices.length} paid`, icon: CircleDollarSign, tone: "bg-emerald-50 text-emerald-700" },
    { label: "Outstanding", value: moneyBy((item) => item.status === "Paid" ? 0 : Math.max(0, item.amount - (item.paidAmount || 0))), meta: openInvoices.length ? "Awaiting payment" : "Nothing due", icon: WalletCards, tone: "bg-amber-50 text-amber-700" },
    { label: "Overdue", value: String(overdueInvoices.length), meta: totals(overdueInvoices, currency), icon: Clock3, tone: "bg-rose-50 text-rose-700" },
  ];

  return <div className="crm-light-portal crm-design-shell crm-billing-portal space-y-4">
    <div className="crm-page-header"><div className="crm-page-header-main"><div className="crm-page-header-tab"><h2 className="crm-page-title">{role === "client" ? "Payments" : "Billing & finance"}</h2></div><div className="crm-page-header-meta"><p className="crm-page-subtitle">{role === "client" ? "Pay an invoice or add advance balance" : "Invoice status, collections, and client advance payments"}</p></div></div>{canPay && <div className="flex flex-wrap gap-2"><button type="button" className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={openAdvance}><WalletCards className="size-4"/>{role === "client" ? "Make payment" : "Advance payment"}</button>{canManage && <Button onClick={startCreate}><Plus className="size-4"/>New invoice</Button>}</div>}</div>
    <section className="crm-billing-kpis">
      {kpis.map(({ label, value, meta, icon: Icon, tone }) => (
        <Card key={label} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon className="size-4" /></div>
          </div>
          <p className="mt-3 text-xl font-semibold tracking-tight text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{meta}</p>
        </Card>
      ))}
    </section>
    {advanceAccounts.length > 0 && <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{advanceAccounts.map((account) => <Card key={account._id} className="p-3"><p className="text-xs font-medium text-slate-500">{account.client?.name || "Client"} advance</p><p className="mt-1 text-lg font-semibold text-slate-900">{formatMoney(account.balance, account.currency)}</p><p className="text-[11px] text-slate-500">{account.currency} prepaid balance</p></Card>)}</section>}
    {error && !open && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <Card>
      <div className="crm-billing-filterbar">
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"/><input aria-label="Search invoices" className="crm-input pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search invoices..."/></div>
        <select aria-label="Filter invoices by status" className="crm-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option>{invoiceStatuses.map((item) => <option key={item}>{item}</option>)}</select>
        <select aria-label="Filter invoices by client" className="crm-input" value={clientFilter} onChange={(event) => setClientFilter(event.target.value)}><option value="all">All clients</option>{clients.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select>
        <select aria-label="Filter invoices by currency" className="crm-input" value={currencyFilter} onChange={(event) => setCurrencyFilter(event.target.value)}><option value="all">All currencies</option>{currencies.map((item) => <option key={item}>{item}</option>)}</select>
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><Filter className="size-4"/>{filtered.length} records</span>
      </div>
      {filtered.length ? <div className="crm-responsive-table overflow-x-auto"><table className="crm-compact-table"><thead className="crm-table-head"><tr><th className="px-2 py-2">Invoice</th><th className="px-2 py-2">Client</th><th className="px-2 py-2">Due date</th><th className="px-2 py-2">Amount</th><th className="px-2 py-2">Status</th>{canManage && <th className="px-2 py-2 text-right">Action</th>}</tr></thead><tbody>{filtered.map((item) => <tr key={item._id}><td className="crm-table-cell"><p className="font-mono text-[13px] font-semibold text-[#1d4ed8]">{item.invoiceNumber}</p><p className="mt-0.5 max-w-[16rem] truncate text-xs text-slate-500">{item.pageName} · {item.objective}</p></td><td className="crm-table-cell font-medium text-slate-800">{item.client?.name || "—"}</td><td className="crm-table-cell">{formatDate(item.dueDate)}</td><td className="crm-table-cell font-semibold tabular-nums text-slate-900"><p>{formatMoney(item.amount, item.currency)}</p>{(item.paidAmount || 0) > 0 && item.status !== "Paid" && <p className="mt-0.5 text-[11px] font-medium text-emerald-700">Paid {formatMoney(item.paidAmount || 0, item.currency)} · due {formatMoney(Math.max(0, item.amount - (item.paidAmount || 0)), item.currency)}</p>}{canPay && item.status !== "Paid" && <button type="button" className="mt-1 block text-[11px] font-semibold text-[#1d4ed8] hover:underline" onClick={() => { setAdvanceOpen(false); setPartialInvoice(item); }}>Partial payment</button>}</td><td className="crm-table-cell"><StatusBadge tone={item.status === "Paid" ? "success" : item.status === "Overdue" ? "danger" : item.status === "Partial" ? "warning" : "warning"}>{item.status}</StatusBadge></td>{canManage && <td className="crm-table-cell"><div className="flex justify-end gap-1"><button type="button" className="crm-icon-button" onClick={() => openInvoiceView(item)} aria-label={`View ${item.invoiceNumber}`} title="View invoice"><Eye className="size-3.5"/></button><button type="button" className="crm-icon-button" onClick={() => startEdit(item)} aria-label={`Edit ${item.invoiceNumber}`} title="Edit invoice"><Pencil className="size-3.5"/></button><a href={getInvoiceDownloadUrl(agencyId, item._id)} className="crm-icon-button" aria-label={`Download ${item.invoiceNumber}`} title="Download"><Download className="size-3.5"/></a>{item.status !== "Paid" && advanceBalance(item.client?._id, item.currency) > 0 && <button type="button" className="crm-icon-button" disabled={busy === `advance-${item._id}`} onClick={() => void applyAdvance(item)} aria-label={`Apply advance to ${item.invoiceNumber}`} title="Apply advance"><WalletCards className="size-3.5"/></button>}{item.status !== "Paid" && <button type="button" className="crm-icon-button" disabled={busy === item._id} onClick={() => { void run(item._id, () => onMarkPaid(item._id), "Could not mark invoice paid").catch(() => undefined); }} aria-label={`Mark ${item.invoiceNumber} paid`} title="Mark paid"><CircleDollarSign className="size-3.5"/></button>}<button type="button" className="crm-icon-button text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700" onClick={() => void remove(item)} aria-label={`Delete ${item.invoiceNumber}`} title="Delete invoice"><Trash2 className="size-3.5"/></button></div></td>}</tr>)}</tbody></table></div> : <div className="crm-empty"><ReceiptText className="size-5"/>No invoices match the current filters.</div>}
    </Card>
    {editing && !open && <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(null); }}>
      <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="invoice-view-title">
        <div className="flex items-center justify-between border-b border-slate-200 p-4"><h3 id="invoice-view-title" className="font-semibold">Invoice view</h3><button className="crm-icon-button" onClick={() => setEditing(null)} aria-label="Close"><X className="size-4"/></button></div>
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <div><p className="crm-label">Invoice</p><p className="font-mono font-semibold text-[#1d4ed8]">{editing.invoiceNumber}</p></div>
          <div><p className="crm-label">Client</p><p>{editing.client?.name || "—"}</p></div>
          <div><p className="crm-label">Page</p><p>{editing.pageName}</p></div>
          <div><p className="crm-label">Objective</p><p>{editing.objective}</p></div>
          <div><p className="crm-label">Budget</p><p>{formatMoney(editing.budget.amount, editing.budget.currency)} / {editing.budget.type}</p></div>
          <div><p className="crm-label">Duration</p><p>{editing.durationDays} days</p></div>
          <div><p className="crm-label">Rate</p><p>{editing.rate}</p></div>
          <div><p className="crm-label">Amount</p><p className="font-semibold text-slate-900">{formatMoney(editing.amount, editing.currency)}</p>{(editing.paidAmount || 0) > 0 && <p className="text-xs text-emerald-700">Advance applied {formatMoney(editing.paidAmount || 0, editing.currency)}</p>}</div>
          <div><p className="crm-label">Discount</p><p>{editing.discountAmount || 0}</p></div>
          <div><p className="crm-label">Correction</p><p>{editing.correctionAmount || 0}</p></div>
          <div><p className="crm-label">Status</p><p>{editing.status}</p></div>
          <div><p className="crm-label">Due date</p><p>{formatDate(editing.dueDate)}</p></div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 p-4"><a className="rounded-md border border-slate-300 px-4 py-2 text-sm" href={getInvoiceDownloadUrl(agencyId, editing._id)} download>Download</a><button type="button" className="rounded-md border border-slate-300 px-4 py-2 text-sm" onClick={() => setEditing(null)}>Close</button></div>
      </Card>
    </div>}
    {open && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="invoice-title">
        <div className="flex items-center justify-between border-b border-slate-200 p-4"><h3 id="invoice-title" className="font-semibold text-slate-900">{editing ? "Edit invoice" : "Create invoice"}</h3><button className="crm-icon-button" onClick={close} aria-label="Close"><X className="size-4"/></button></div>
        <form onSubmit={submit} className="grid gap-3 p-4 sm:grid-cols-2">
          {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{error}</div>}
          {!editing && <>
            <label><span className="crm-label">Client</span><select required className="crm-input" value={client} onChange={(event) => { setClient(event.target.value); setAdRequest(""); }}><option value="">Select client</option>{clients.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>
            <label><span className="crm-label">Linked request</span><select required className="crm-input" value={adRequest} onChange={(event) => setAdRequest(event.target.value)} disabled={!client}><option value="">Select approved or live request</option>{matchingRequests.map((item) => <option key={item._id} value={item._id}>{item.requestNumber} · {item.pageName}</option>)}</select></label>
            {selectedRequest && selectedClient && <div className="grid gap-x-4 gap-y-3 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm sm:col-span-2 sm:grid-cols-2">
              <div><p className="crm-label">Page</p><p>{selectedRequest.pageName}</p></div>
              <div><p className="crm-label">Objective</p><p>{selectedRequest.objective}</p></div>
              <div><p className="crm-label">Budget</p><p>{formatMoney(selectedRequest.budget.amount, selectedRequest.budget.currency)} / {selectedRequest.budget.type}</p></div>
              <div><p className="crm-label">Duration</p><p>{selectedRequest.durationDays} days</p></div>
              <div><p className="crm-label">Billing rate</p><p>{selectedClient.billingRate.toLocaleString()} {selectedClient.billingCurrency || "BDT"} / budget unit</p></div>
              <div><p className="crm-label">Invoice amount</p><p className="font-semibold text-slate-900">{formatMoney(calculatedAmount, selectedClient.billingCurrency || "BDT")}</p></div>
            </div>}
          </>}
          {editing && <>
            <label><span className="crm-label">Status</span><select className="crm-input" value={invoiceStatus} onChange={(event) => setInvoiceStatus(event.target.value as InvoiceStatus)}>{editableStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
            <label className="sm:col-span-2"><span className="crm-label">Notes</span><textarea className="crm-input min-h-24 resize-y" maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)}/></label>
          </>}
          <label><span className="crm-label">Discount</span><input type="number" min="0" step="0.01" className="crm-input" value={discountAmount} onChange={(event) => setDiscountAmount(event.target.value)}/></label>
          <label><span className="crm-label">Correction</span><input type="number" step="0.01" className="crm-input" value={correctionAmount} onChange={(event) => setCorrectionAmount(event.target.value)}/></label>
          <label><span className="crm-label">Due date</span><input required type="date" className="crm-input" value={dueDate} onChange={(event) => setDueDate(event.target.value)}/></label>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 sm:col-span-2"><button type="button" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={close}>Cancel</button><Button disabled={busy === "form"}>{busy === "form" ? "Saving..." : "Save invoice"}</Button></div>
        </form>
      </Card>
    </div>}
    {(advanceOpen || partialInvoice) && <AdvancePaymentDialog open editing={null} lockedInvoice={partialInvoice} clients={clients} invoices={invoices} accounts={accounts} agencyId={agencyId} lockedClientId={role === "client" ? currentClientId || clients[0]?._id : undefined} onClose={() => { setAdvanceOpen(false); setPartialInvoice(null); }} onRecord={onRecordAdvance} onApply={onApplyAdvance} />}
  </div>;
}
