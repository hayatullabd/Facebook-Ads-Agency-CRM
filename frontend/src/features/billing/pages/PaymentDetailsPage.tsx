import { useEffect, useMemo, useState } from "react";
import { Download, ReceiptText, Search, WalletCards } from "lucide-react";
import type { Client, Invoice, Role } from "../../../types/crm";
import { formatDate, formatMoney } from "../../../lib/formatters";
import { isAgencyStaff } from "../../../lib/permissions";
import { Card } from "../../shared/Card";
import { AdvancePaymentDialog, type EditablePayment } from "../AdvancePaymentDialog";
import { AgencyPaymentDetailsPanel } from "../AgencyPaymentDetails";
import { openPaymentScreenshot, type PaymentAccount, type PaymentTransaction } from "../paymentApi";

export function PaymentDetailsPage({ onLoad, role, clients, invoices, currentClientId, agencyId, onRecordAdvance, onApplyAdvance, onUpdatePayment }: {
  onLoad: () => Promise<{ accounts: PaymentAccount[]; transactions: PaymentTransaction[] }>;
  role: Role;
  clients: Client[];
  invoices: Invoice[];
  currentClientId?: string | null;
  agencyId: string;
  onRecordAdvance: (payload: { client: string; amount: number; currency: string; method: string; reference?: string; description?: string; transactionDate?: string; screenshot?: string }) => Promise<void>;
  onApplyAdvance: (invoiceId: string, amount?: number) => Promise<void>;
  onUpdatePayment: (id: string, payload: { amount: number; method: string; reference?: string; description?: string; transactionDate?: string; screenshot?: string }) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [payOpen, setPayOpen] = useState(false);
  const [editing, setEditing] = useState<EditablePayment | null>(null);
  const canPay = isAgencyStaff(role) || role === "client";

  useEffect(() => {
    let active = true;
    setLoading(true);
    onLoad().then((result) => {
      if (!active) return;
      setAccounts(result.accounts);
      setTransactions(result.transactions);
      setError("");
    }).catch((reason) => {
      if (active) setError(reason instanceof Error ? `Payment details could not load: ${reason.message}` : "Payment details could not load");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [onLoad]);

  const accountBalances = useMemo(() => new Map(accounts.map((account) => [account._id, account.balance])), [accounts]);
  const ledger = useMemo(() => transactions.map((item) => ({
    id: item._id,
    date: item.transactionDate,
    description: item.description || (item.type === "credit" ? "Payment received" : "Payment charged"),
    reference: item.reference || item.invoice?.invoiceNumber || "—",
    debit: item.type === "debit" ? item.amount : 0,
    credit: item.type === "credit" ? item.amount : 0,
    balance: item.balance ?? (item.account ? accountBalances.get(item.account._id) : undefined),
    currency: item.currency,
    hasScreenshot: Boolean(item.hasScreenshot),
    type: item.type,
    method: item.method || "manual",
    note: item.description || "",
    rawReference: item.reference || "",
  })), [accountBalances, transactions]);
  const filtered = ledger.filter((entry) => !search.trim() || [entry.description, entry.reference].some((value) => value.toLowerCase().includes(search.toLowerCase())));

  const exportLedger = () => {
    const rows = [["Date", "Description", "Reference", "Debit", "Credit", "Balance", "Currency"], ...ledger.map((item) => [item.date.slice(0, 10), item.description, item.reference, item.debit, item.credit, item.balance ?? "", item.currency])];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = "payment-ledger.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return <div className="crm-light-portal crm-design-shell space-y-4 text-[#17243b]">
    <div className="crm-page-header"><div className="crm-page-header-main"><div className="crm-page-header-tab"><h2 className="crm-page-title">Payment Details</h2></div><div className="crm-page-header-meta"><p className="crm-page-subtitle">{role === "client" ? "Your payments, advance balance, and invoice charges" : "Invoice charges, payments, and running balances"}</p></div></div><div className="flex flex-wrap gap-2">{canPay && <button type="button" onClick={() => { setEditing(null); setPayOpen(true); }} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1d4ed8] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1e40af]"><WalletCards className="size-4" />Make payment</button>}<button onClick={exportLedger} disabled={!ledger.length} className="inline-flex items-center justify-center gap-2 rounded border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-[#1e40af] hover:bg-slate-50 disabled:opacity-50"><Download className="size-4" />Export Ledger</button>    </div></div>
    {role === "client" && <AgencyPaymentDetailsPanel agencyId={agencyId} canEdit={false} />}
    {accounts.length > 0 && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{accounts.map((account) => <Card key={account._id} className="p-3"><p className="text-xs font-semibold text-slate-500">{account.name}</p><p className="mt-1 text-lg font-bold text-[#1e40af]">{formatMoney(account.balance, account.currency)}</p><p className="text-[11px] text-slate-500">{account.client?.name || "Payment account"}</p></Card>)}</div>}
    {error && <div role="alert" className="border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}
    <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input className="crm-input pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ledger" /></div>
    <Card className="overflow-x-auto">
      {loading ? <div className="p-10 text-center text-sm text-slate-500">Loading payment details...</div> : filtered.length ? <table className="w-full min-w-[850px] border-collapse text-left text-xs">
        <thead className="bg-slate-50 text-slate-500"><tr>{["Date", "Particulars / Description", "Payment Type / Ref", "Payable (Debit)", "Payment (Credit)", "Balance"].map((label) => <th key={label} className="border-r border-slate-200 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide last:border-r-0">{label}</th>)}</tr></thead>
        <tbody>{filtered.map((entry) => <tr key={entry.id} className="border-b border-gray-200 hover:bg-slate-50"><td className="border-r border-gray-200 px-3 py-2 text-slate-600">{formatDate(entry.date)}</td><td className="border-r border-gray-200 px-3 py-2 font-medium text-slate-800">{entry.description}</td><td className="border-r border-gray-200 px-3 py-2 text-slate-600">{entry.reference}{entry.hasScreenshot && <button type="button" className="mt-1 block font-semibold text-[#1d4ed8] hover:underline" onClick={() => { void openPaymentScreenshot(agencyId, entry.id).catch(() => setError("Screenshot could not be opened")); }}>View screenshot</button>}</td><td className="border-r border-gray-200 px-3 py-2 text-right font-semibold text-rose-600">{entry.debit ? formatMoney(entry.debit, entry.currency) : "—"}</td><td className="border-r border-gray-200 px-3 py-2 text-right font-semibold text-emerald-600">{entry.credit ? formatMoney(entry.credit, entry.currency) : "—"}{entry.type === "credit" && canPay && <button type="button" className="mt-1 block font-semibold text-[#1d4ed8] hover:underline" onClick={() => { setPayOpen(false); setEditing({ id: entry.id, amount: entry.credit, currency: entry.currency === "USD" || entry.currency === "INR" ? entry.currency : "BDT", method: entry.method, reference: entry.rawReference, description: entry.note, transactionDate: entry.date, hasScreenshot: entry.hasScreenshot }); }}>Edit</button>}</td><td className="px-3 py-2 text-right font-bold text-[#1e40af]">{entry.balance == null ? "—" : formatMoney(entry.balance, entry.currency)}</td></tr>)}</tbody>
      </table> : <div className="flex items-center justify-center gap-2 p-10 text-sm text-gray-500"><ReceiptText className="size-5" />No payment details available.</div>}
    </Card>
    <AdvancePaymentDialog open={payOpen || Boolean(editing)} editing={editing} clients={clients} invoices={invoices} accounts={accounts} agencyId={agencyId} lockedClientId={role === "client" ? currentClientId || clients[0]?._id : undefined} onClose={() => { setPayOpen(false); setEditing(null); }} onRecord={async (payload) => { await onRecordAdvance(payload); const result = await onLoad(); setAccounts(result.accounts); setTransactions(result.transactions); }} onApply={async (invoiceId) => { await onApplyAdvance(invoiceId); const result = await onLoad(); setAccounts(result.accounts); setTransactions(result.transactions); }} onUpdate={async (id, payload) => { await onUpdatePayment(id, payload); const result = await onLoad(); setAccounts(result.accounts); setTransactions(result.transactions); }} />
  </div>;
}
