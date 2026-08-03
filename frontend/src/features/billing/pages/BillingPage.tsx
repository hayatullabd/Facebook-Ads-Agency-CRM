import { useMemo, useState } from "react";
import { CircleDollarSign, ReceiptText, Search } from "lucide-react";
import type { Invoice, Role } from "../../../types/crm";
import { formatDate, formatMoney } from "../../../lib/formatters";
import { Card } from "../../shared/Card";
import { StatusBadge } from "../../shared/StatusBadge";

export function BillingPage({ invoices, role, onMarkPaid }: { invoices: Invoice[]; role: Role; onMarkPaid: (id: string) => Promise<void> }) {
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const canManage = role === "admin" || role === "team";
  const filtered = useMemo(() => invoices.filter((invoice) => !search.trim() || [invoice.invoiceNumber, invoice.pageName, invoice.objective, invoice.client?.name].some((value) => value?.toLowerCase().includes(search.toLowerCase()))), [invoices, search]);
  const totals = useMemo(() => Object.entries(invoices.reduce<Record<string, { total: number; unpaid: number; paid: number }>>((groups, invoice) => {
    const group = groups[invoice.currency] ||= { total: 0, unpaid: 0, paid: 0 };
    group.total += invoice.amount;
    if (invoice.status === "Paid") group.paid += invoice.amount;
    else group.unpaid += invoice.amount;
    return groups;
  }, {})), [invoices]);
  const mark = async (id: string) => { setBusy(id); setError(""); try { await onMarkPaid(id); } catch (err) { setError(err instanceof Error ? err.message : "Could not update invoice"); } finally { setBusy(""); } };

  return <div className="crm-page-shell">
    <section className="crm-section-heading border-b border-[var(--border)] pb-5"><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-emerald-300">Finance ledger</p><h2 className="mt-1 crm-page-title">Request-wise billing</h2><p className="crm-page-subtitle">Every live brief is a separate, traceable bill. No monthly consolidation.</p></div><p className="mt-3 font-mono text-[10px] uppercase tracking-[.13em] text-slate-500 sm:mt-0">{invoices.length} invoices</p></section>
    <section className="grid border border-[var(--border)] bg-[var(--surface)] sm:grid-cols-2 xl:grid-cols-3">{totals.length ? totals.map(([currency, amount], index) => <div key={currency} className={`p-4 ${index ? "border-t border-[var(--border)] sm:border-l sm:border-t-0 xl:border-t-0" : ""}`}><p className="font-mono text-[10px] uppercase tracking-[.13em] text-slate-500">{currency} billing</p><p className="mt-4 text-2xl font-semibold tracking-[-.04em] text-slate-100">{formatMoney(amount.total, currency)}</p><div className="mt-3 flex gap-3 text-xs"><span className="text-emerald-300">{formatMoney(amount.paid, currency)} paid</span><span className="text-amber-300">{formatMoney(amount.unpaid, currency)} open</span></div></div>) : <div className="p-4 text-sm text-slate-400">No billing totals available.</div>}</section>
    {error && <div role="alert" className="border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div>}
    <Card><div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="crm-section-title">Invoice register</h3><p className="crm-section-caption">Search by invoice number, client, page, or campaign objective.</p></div><div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-600"/><input aria-label="Search invoices" className="crm-input pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filter invoice register..."/></div></div>
      {filtered.length ? <div className="crm-responsive-table overflow-x-auto"><table className="w-full"><thead className="crm-table-head"><tr><th className="px-4 py-3">Invoice / request</th><th className="px-4 py-3">Client & scope</th><th className="px-4 py-3">Rate</th><th className="px-4 py-3">Due date</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3">Status</th>{canManage && <th className="px-4 py-3 text-right">Action</th>}</tr></thead><tbody>{filtered.map((invoice) => <tr key={invoice._id} className="transition hover:bg-emerald-300/[.025]"><td className="crm-table-cell"><p className="font-mono text-xs font-medium text-emerald-300">{invoice.invoiceNumber}</p><p className="mt-1 text-xs text-slate-500">{invoice.adRequest?.requestNumber || "Request archived"}</p></td><td className="crm-table-cell"><p className="font-medium text-slate-200">{invoice.client?.name || "—"}</p><p className="mt-1 text-xs text-slate-500">{invoice.pageName} · {invoice.objective}</p></td><td className="crm-table-cell font-mono text-xs text-slate-400">{invoice.currency === "BDT" ? `৳${invoice.rate}/USD` : "—"}</td><td className="crm-table-cell text-slate-400">{formatDate(invoice.dueDate)}</td><td className="crm-table-cell text-right font-mono text-xs font-medium text-slate-200">{formatMoney(invoice.amount, invoice.currency)}</td><td className="crm-table-cell"><StatusBadge tone={invoice.status === "Paid" ? "success" : invoice.status === "Overdue" ? "danger" : "warning"}>{invoice.status}</StatusBadge></td>{canManage && <td className="crm-table-cell text-right"><button disabled={invoice.status === "Paid" || busy === invoice._id} onClick={() => void mark(invoice._id)} className="inline-flex items-center gap-1.5 border border-emerald-300/20 bg-emerald-300/[.06] px-3 py-1.5 text-xs text-emerald-200 transition hover:bg-emerald-300 hover:text-[#102016] disabled:opacity-40"><CircleDollarSign className="size-3.5"/>{busy === invoice._id ? "Saving…" : "Mark paid"}</button></td>}</tr>)}</tbody></table></div> : <div className="crm-empty"><ReceiptText className="size-5"/>No invoices found.</div>}</Card>
  </div>;
}
