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
  const totals = useMemo(() => Object.entries(invoices.reduce<Record<string, { total: number; unpaid: number }>>((groups, invoice) => {
    const group = groups[invoice.currency] ||= { total: 0, unpaid: 0 };
    group.total += invoice.amount;
    if (invoice.status !== "Paid") group.unpaid += invoice.amount;
    return groups;
  }, {})), [invoices]);
  const mark = async (id: string) => {
    setBusy(id); setError("");
    try { await onMarkPaid(id); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not update invoice"); }
    finally { setBusy(""); }
  };

  return <div className="space-y-4">
    <div><h2 className="crm-page-title">Billing & finance</h2><p className="crm-page-subtitle">Currency-safe invoice status and outstanding balances</p></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{totals.length ? totals.map(([currency, amount]) => <Card key={currency} className="p-4"><p className="text-[11px] uppercase text-slate-500">{currency} totals</p><p className="mt-2 text-2xl font-bold">{formatMoney(amount.total, currency)}</p><p className="mt-1 text-sm text-red-400">{formatMoney(amount.unpaid, currency)} outstanding</p></Card>) : <Card className="p-4 text-sm text-slate-400">No billing totals available.</Card>}</div>
    {error && <div role="alert" className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}
    <Card><div className="border-b border-[#20293a] p-3"><div className="relative max-w-md"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-600"/><input aria-label="Search invoices" className="crm-input pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search invoices..."/></div></div>
      {filtered.length ? <div className="crm-responsive-table overflow-x-auto"><table className="w-full"><thead className="crm-table-head"><tr><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Due date</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th>{canManage && <th className="px-4 py-3 text-right">Action</th>}</tr></thead><tbody>{filtered.map((invoice) => <tr key={invoice._id} className="hover:bg-white/[0.02]"><td className="crm-table-cell"><p className="font-mono font-medium text-blue-400">{invoice.invoiceNumber}</p><p className="text-xs text-slate-500">{invoice.pageName} · {invoice.objective}</p></td><td className="crm-table-cell">{invoice.client?.name || "—"}</td><td className="crm-table-cell">{formatDate(invoice.dueDate)}</td><td className="crm-table-cell font-semibold text-slate-200">{formatMoney(invoice.amount, invoice.currency)}</td><td className="crm-table-cell"><StatusBadge tone={invoice.status === "Paid" ? "success" : invoice.status === "Overdue" ? "danger" : "warning"}>{invoice.status}</StatusBadge></td>{canManage && <td className="crm-table-cell text-right"><button disabled={invoice.status === "Paid" || busy === invoice._id} onClick={() => void mark(invoice._id)} className="inline-flex items-center gap-1.5 rounded-md border border-[#263044] bg-[#0d121e] px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40"><CircleDollarSign className="size-3.5"/>Mark Paid</button></td>}</tr>)}</tbody></table></div> : <div className="crm-empty"><ReceiptText className="size-5"/>No invoices found.</div>}
    </Card>
  </div>;
}
