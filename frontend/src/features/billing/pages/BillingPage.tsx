import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CircleDollarSign, Filter, Pencil, Plus, ReceiptText, Search, Trash2, X } from "lucide-react";
import type { AdRequest, Client, Invoice, InvoiceStatus, Role } from "../../../types/crm";
import type { CreateInvoicePayload, UpdateInvoicePayload } from "../billingApi";
import { formatDate, formatMoney } from "../../../lib/formatters";
import { Button } from "../../shared/Button";
import { Card } from "../../shared/Card";
import { StatusBadge } from "../../shared/StatusBadge";

const invoiceStatuses: InvoiceStatus[] = ["Unpaid", "Paid", "Overdue"];
const editableStatuses: Array<Exclude<InvoiceStatus, "Paid">> = ["Unpaid", "Overdue"];
const totals = (items: Invoice[]) => {
  const map = new Map<string, number>();
  items.forEach((item) => map.set(item.currency, (map.get(item.currency) || 0) + item.amount));
  return map.size ? [...map].map(([currency, amount]) => formatMoney(amount, currency)).join(" · ") : formatMoney(0, "BDT");
};

type Props = {
  invoices: Invoice[];
  clients: Client[];
  requests: AdRequest[];
  role: Role;
  onCreateInvoice: (payload: CreateInvoicePayload) => Promise<void>;
  onUpdateInvoice: (id: string, payload: UpdateInvoicePayload) => Promise<void>;
  onDeleteInvoice: (id: string) => Promise<void>;
  onMarkPaid: (id: string) => Promise<void>;
};

export function BillingPage({ invoices, clients, requests, role, onCreateInvoice, onUpdateInvoice, onDeleteInvoice, onMarkPaid }: Props) {
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
  const [invoiceStatus, setInvoiceStatus] = useState<Exclude<InvoiceStatus, "Paid">>("Unpaid");
  const [notes, setNotes] = useState("");

  const canManage = role === "admin" || role === "team";
  const matchingRequests = useMemo(
    () => requests.filter((item) => item.client?._id === client && ["Approved", "Live"].includes(item.status)),
    [requests, client],
  );
  const selectedRequest = useMemo(() => matchingRequests.find((item) => item._id === adRequest), [matchingRequests, adRequest]);
  const selectedClient = useMemo(() => clients.find((item) => item._id === client), [clients, client]);
  const calculatedAmount = selectedRequest && selectedClient
    ? selectedRequest.budget.amount * selectedRequest.durationDays * selectedClient.billingRate
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
    setError("");
    setOpen(true);
  };
  const startEdit = (item: Invoice) => {
    setEditing(item);
    setDueDate(item.dueDate.slice(0, 10));
    setInvoiceStatus(item.status === "Overdue" ? "Overdue" : "Unpaid");
    setNotes(item.notes || "");
    setError("");
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [open]);

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
        await run("form", () => onUpdateInvoice(editing._id, { status: invoiceStatus, dueDate, notes }), "Could not update invoice");
      } else {
        await run("form", () => onCreateInvoice({ client, adRequest, dueDate }), "Could not create invoice");
      }
      close();
    } catch { /* surfaced */ }
  };
  const remove = async (item: Invoice) => {
    if (!window.confirm(`Delete invoice ${item.invoiceNumber}? This cannot be undone.`)) return;
    try {
      await run(`delete-${item._id}`, () => onDeleteInvoice(item._id), "Could not delete invoice");
    } catch { /* surfaced */ }
  };

  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-3">
      <div><h2 className="crm-page-title">Billing & finance</h2><p className="crm-page-subtitle">Invoice status and outstanding balances</p></div>
      {canManage && <Button onClick={startCreate}><Plus className="size-4"/>New invoice</Button>}
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <Card className="p-4"><p className="text-[11px] uppercase text-slate-500">Total billed</p><p className="mt-2 break-words text-xl font-bold">{totals(invoices)}</p></Card>
      <Card className="p-4"><p className="text-[11px] uppercase text-slate-500">Outstanding</p><p className="mt-2 break-words text-xl font-bold text-red-400">{totals(invoices.filter((item) => item.status !== "Paid"))}</p></Card>
    </div>
    {error && !open && <div role="alert" className="rounded-md bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
    <Card>
      <div className="crm-toolbar sm:grid-cols-2 xl:grid-cols-[minmax(16rem,1fr)_repeat(3,minmax(9rem,12rem))_auto]">
        <div className="relative sm:col-span-2 xl:col-span-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-600"/><input aria-label="Search invoices" className="crm-input pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search invoices..."/></div>
        <select aria-label="Filter invoices by status" className="crm-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option>{invoiceStatuses.map((item) => <option key={item}>{item}</option>)}</select>
        <select aria-label="Filter invoices by client" className="crm-input" value={clientFilter} onChange={(event) => setClientFilter(event.target.value)}><option value="all">All clients</option>{clients.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select>
        <select aria-label="Filter invoices by currency" className="crm-input" value={currencyFilter} onChange={(event) => setCurrencyFilter(event.target.value)}><option value="all">All currencies</option>{currencies.map((item) => <option key={item}>{item}</option>)}</select>
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><Filter className="size-4"/>{filtered.length} records</span>
      </div>
      {filtered.length ? <div className="crm-responsive-table overflow-x-auto"><table className="crm-compact-table"><thead className="crm-table-head"><tr><th className="px-2 py-2">Invoice</th><th className="px-2 py-2">Client</th><th className="px-2 py-2">Due date</th><th className="px-2 py-2">Amount</th><th className="px-2 py-2">Status</th>{canManage && <th className="px-2 py-2 text-right">Action</th>}</tr></thead><tbody>{filtered.map((item) => <tr key={item._id}><td className="crm-table-cell"><p className="font-mono text-blue-400">{item.invoiceNumber}</p><p className="text-xs text-slate-500">{item.pageName} · {item.objective}</p></td><td className="crm-table-cell">{item.client?.name || "—"}</td><td className="crm-table-cell">{formatDate(item.dueDate)}</td><td className="crm-table-cell font-semibold">{formatMoney(item.amount, item.currency)}</td><td className="crm-table-cell"><StatusBadge tone={item.status === "Paid" ? "success" : item.status === "Overdue" ? "danger" : "warning"}>{item.status}</StatusBadge></td>{canManage && <td className="crm-table-cell"><div className="flex justify-end gap-1">{item.status !== "Paid" && <><button className="crm-icon-button" onClick={() => startEdit(item)} aria-label={`Edit ${item.invoiceNumber}`}><Pencil className="size-3.5"/></button><button className="crm-icon-button" disabled={busy === item._id} onClick={() => void run(item._id, () => onMarkPaid(item._id), "Could not mark invoice paid").catch(() => undefined)} aria-label={`Mark ${item.invoiceNumber} paid`}><CircleDollarSign className="size-3.5"/></button><button className="crm-icon-button hover:text-red-300" onClick={() => void remove(item)} aria-label={`Delete ${item.invoiceNumber}`}><Trash2 className="size-3.5"/></button></>}</div></td>}</tr>)}</tbody></table></div> : <div className="crm-empty"><ReceiptText className="size-5"/>No invoices match the current filters.</div>}
    </Card>
    {open && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="invoice-title">
        <div className="flex items-center justify-between border-b border-[#20293a] p-4"><h3 id="invoice-title" className="font-semibold">{editing ? "Edit unpaid invoice" : "Create invoice"}</h3><button className="crm-icon-button" onClick={close} aria-label="Close"><X className="size-4"/></button></div>
        <form onSubmit={submit} className="grid gap-4 p-5 sm:grid-cols-2">
          {error && <div role="alert" className="rounded-md bg-red-500/10 p-3 text-sm text-red-300 sm:col-span-2">{error}</div>}
          {!editing && <>
            <label><span className="crm-label">Client</span><select required className="crm-input" value={client} onChange={(event) => { setClient(event.target.value); setAdRequest(""); }}><option value="">Select client</option>{clients.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>
            <label><span className="crm-label">Linked request</span><select required className="crm-input" value={adRequest} onChange={(event) => setAdRequest(event.target.value)} disabled={!client}><option value="">Select approved or live request</option>{matchingRequests.map((item) => <option key={item._id} value={item._id}>{item.requestNumber} · {item.pageName}</option>)}</select></label>
            {selectedRequest && selectedClient && <div className="grid gap-x-4 gap-y-3 rounded-md border border-[#20293a] bg-[#111722] p-4 text-sm sm:col-span-2 sm:grid-cols-2">
              <div><p className="crm-label">Page</p><p>{selectedRequest.pageName}</p></div>
              <div><p className="crm-label">Objective</p><p>{selectedRequest.objective}</p></div>
              <div><p className="crm-label">Budget</p><p>{formatMoney(selectedRequest.budget.amount, selectedRequest.budget.currency)} / {selectedRequest.budget.type}</p></div>
              <div><p className="crm-label">Duration</p><p>{selectedRequest.durationDays} days</p></div>
              <div><p className="crm-label">Billing rate</p><p>{selectedClient.billingRate.toLocaleString()} agency currency / budget unit</p></div>
              <div><p className="crm-label">Invoice amount</p><p className="font-semibold text-blue-300">{calculatedAmount.toLocaleString()} agency currency</p></div>
            </div>}
          </>}
          {editing && <>
            <label><span className="crm-label">Status</span><select className="crm-input" value={invoiceStatus} onChange={(event) => setInvoiceStatus(event.target.value as Exclude<InvoiceStatus, "Paid">)}>{editableStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
            <label className="sm:col-span-2"><span className="crm-label">Notes</span><textarea className="crm-input min-h-24 resize-y" maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)}/></label>
          </>}
          <label><span className="crm-label">Due date</span><input required type="date" className="crm-input" value={dueDate} onChange={(event) => setDueDate(event.target.value)}/></label>
          <div className="flex justify-end gap-2 border-t border-[#20293a] pt-4 sm:col-span-2"><button type="button" className="rounded-md border border-[#263044] px-4 py-2 text-sm" onClick={close}>Cancel</button><Button disabled={busy === "form"}>{busy === "form" ? "Saving..." : "Save invoice"}</Button></div>
        </form>
      </Card>
    </div>}
  </div>;
}
