import { useEffect, useMemo, useState } from "react";
import { Download, ReceiptText, Search } from "lucide-react";
import { formatDate, formatMoney } from "../../../lib/formatters";
import { Card } from "../../shared/Card";
import type { PaymentAccount, PaymentTransaction } from "../paymentApi";

export function PaymentDetailsPage({ onLoad }: {
  onLoad: () => Promise<{ accounts: PaymentAccount[]; transactions: PaymentTransaction[] }>;
}) {
  const [search, setSearch] = useState("");
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    onLoad().then((result) => {
      if (!active) return;
      setAccounts(result.accounts);
      setTransactions(result.transactions);
      setError("");
    }).catch((reason) => {
      if (active) setError(reason instanceof Error ? reason.message : "Payment details could not load");
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
    <div className="crm-page-header"><div className="crm-page-header-main"><div className="crm-page-header-tab"><h2 className="crm-page-title">Payment Details</h2></div><div className="crm-page-header-meta"><p className="crm-page-subtitle">Invoice charges, payments, and running balances</p></div></div><button onClick={exportLedger} disabled={!ledger.length} className="inline-flex items-center justify-center gap-2 rounded border border-gray-300 bg-gray-50 px-3 py-2 text-xs font-semibold text-[#1e40af] hover:bg-gray-100 disabled:opacity-50"><Download className="size-4" />Export Ledger</button></div>
    {accounts.length > 0 && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{accounts.map((account) => <Card key={account._id} className="p-3"><p className="text-xs font-semibold text-gray-500">{account.name}</p><p className="mt-1 text-lg font-bold text-[#1e40af]">{formatMoney(account.balance, account.currency)}</p><p className="text-[11px] text-gray-500">{account.client?.name || "Payment account"}</p></Card>)}</div>}
    {error && <div role="alert" className="border border-red-300 bg-red-50 p-3 text-xs text-red-700">Payment details could not load: {error}</div>}
    <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" /><input className="crm-input pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ledger" /></div>
    <Card className="overflow-x-auto">
      {loading ? <div className="p-10 text-center text-sm text-gray-500">Loading payment details...</div> : filtered.length ? <table className="w-full min-w-[850px] border-collapse text-left text-xs">
        <thead className="bg-[#1e40af] text-white"><tr>{["Date", "Particulars / Description", "Payment Type / Ref", "Payable (Debit)", "Payment (Credit)", "Balance"].map((label) => <th key={label} className="border-r border-[#1e3a8a] px-3 py-2.5 font-bold last:border-r-0">{label}</th>)}</tr></thead>
        <tbody>{filtered.map((entry) => <tr key={entry.id} className="border-b border-gray-200 hover:bg-gray-50"><td className="border-r border-gray-200 px-3 py-2 text-gray-600">{formatDate(entry.date)}</td><td className="border-r border-gray-200 px-3 py-2 font-medium">{entry.description}</td><td className="border-r border-gray-200 px-3 py-2 text-gray-600">{entry.reference}</td><td className="border-r border-gray-200 px-3 py-2 text-right font-semibold text-red-600">{entry.debit ? formatMoney(entry.debit, entry.currency) : "—"}</td><td className="border-r border-gray-200 px-3 py-2 text-right font-semibold text-emerald-600">{entry.credit ? formatMoney(entry.credit, entry.currency) : "—"}</td><td className="px-3 py-2 text-right font-bold text-[#1e40af]">{entry.balance == null ? "—" : formatMoney(entry.balance, entry.currency)}</td></tr>)}</tbody>
      </table> : <div className="flex items-center justify-center gap-2 p-10 text-sm text-gray-500"><ReceiptText className="size-5" />No payment details available.</div>}
    </Card>
  </div>;
}
