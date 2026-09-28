import { useEffect, useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { Card } from "../shared/Card";
import { getAgencyPaymentDetails, saveAgencyPaymentDetails, type AgencyPaymentDetail } from "./paymentApi";

export const paymentMethodLabel: Record<AgencyPaymentDetail["method"], string> = { bkash: "bKash", nagad: "Nagad", bank: "Bank", cash: "Cash" };

const bankFields: Array<[keyof AgencyPaymentDetail, string]> = [
  ["accountName", "Account Name"],
  ["accountNumber", "Account Number"],
  ["bankName", "Bank Name"],
  ["branchName", "Branch Name"],
  ["routingNumber", "Routing Number"],
];
const walletFields: Array<[keyof AgencyPaymentDetail, string]> = [
  ["accountName", "Account Name"],
  ["accountNumber", "Account Number"],
];

export const paymentDetailTitle = (item: AgencyPaymentDetail) => item.method === "bank" ? item.bankName : (item.name || paymentMethodLabel[item.method]);
const fieldsFor = (method: AgencyPaymentDetail["method"]) => method === "bank" ? bankFields : walletFields;
const empty = (method: AgencyPaymentDetail["method"]): AgencyPaymentDetail => ({ method, name: "", accountName: "", accountNumber: "", bankName: "", branchName: "", routingNumber: "" });
const copyText = (item: AgencyPaymentDetail) => [`Payment method: ${paymentDetailTitle(item)}`, ...fieldsFor(item.method).map(([key, label]) => `${label}: ${item[key]}`)].join("\n");

const normalize = (item: AgencyPaymentDetail): AgencyPaymentDetail => ({
  method: item.method || "bank",
  name: item.name || "",
  accountName: item.accountName || "",
  accountNumber: item.accountNumber || "",
  bankName: item.bankName || "",
  branchName: item.branchName || "",
  routingNumber: item.routingNumber || "",
});

export function PaymentDetailCards({ details }: { details: AgencyPaymentDetail[] }) {
  const [copied, setCopied] = useState("");
  if (!details.length) return null;
  const copy = async (value: string, key: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied((current) => (current === key ? "" : current)), 1500);
  };
  return <div className="grid gap-2">{details.map((item, index) => <div key={`${paymentDetailTitle(item)}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
    <p className="mb-2 text-xs font-semibold text-slate-700">{paymentDetailTitle(item)}</p>
    <dl className="space-y-1.5">{fieldsFor(item.method).map(([key, label]) => <div key={key} className="flex items-center justify-between gap-3">
      <div className="min-w-0"><dt className="text-[11px] font-semibold text-slate-500">{label}</dt><dd className="break-all text-sm font-medium text-slate-900">{item[key]}</dd></div>
      <button type="button" className="inline-flex shrink-0 items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-[#1d4ed8] hover:bg-slate-50" onClick={() => void copy(String(item[key]), `${index}-${key}`)}><Copy className="size-3" />{copied === `${index}-${key}` ? "Copied" : "Copy"}</button>
    </div>)}</dl>
    <button type="button" className="mt-2 text-xs font-semibold text-[#1d4ed8] hover:underline" onClick={() => void copy(copyText(item), `${index}-all`)}>{copied === `${index}-all` ? "Copied" : "Copy all"}</button>
  </div>)}</div>;
}

export function AgencyPaymentDetailsPanel({ agencyId, canEdit }: { agencyId: string; canEdit: boolean }) {
  const [saved, setSaved] = useState<AgencyPaymentDetail[]>([]);
  const [rows, setRows] = useState<AgencyPaymentDetail[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    getAgencyPaymentDetails(agencyId).then((details) => {
      if (!active) return;
      const next = details.map(normalize);
      setSaved(next.filter((item) => item.accountNumber));
      setRows(next);
    }).catch((reason) => {
      if (active) setError(reason instanceof Error ? reason.message : "Payment details could not load");
    });
    return () => { active = false; };
  }, [agencyId]);

  const update = (index: number, key: keyof AgencyPaymentDetail, value: string) => {
    setRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  };

  const save = async () => {
    const paymentDetails = rows.map((row) => ({
      method: row.method,
      name: row.method === "bank" ? "" : row.name.trim(),
      accountName: row.accountName.trim(),
      accountNumber: row.accountNumber.trim(),
      bankName: row.method === "bank" ? row.bankName.trim() : "",
      branchName: row.method === "bank" ? row.branchName.trim() : "",
      routingNumber: row.method === "bank" ? row.routingNumber.trim() : "",
    })).filter((row) => row.accountName && row.accountNumber && (row.method === "bank" ? row.bankName && row.branchName && row.routingNumber : row.name));
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const next = await saveAgencyPaymentDetails(agencyId, paymentDetails);
      setSaved(next.map(normalize));
      setRows(next.map(normalize));
      setMessage("Saved. Clients only see these methods.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Payment details could not be saved");
    } finally {
      setBusy(false);
    }
  };

  if (!canEdit) {
    if (!saved.length) return null;
    return <Card className="space-y-3 p-4"><div><h3 className="text-sm font-semibold text-slate-900">Pay to</h3><p className="mt-0.5 text-xs text-slate-500">Copy the details for the method you are paying with.</p></div><PaymentDetailCards details={saved} /></Card>;
  }

  const methods = rows.map((row, index) => ({ row, index })).filter((item) => item.row.method !== "bank");
  const banks = rows.map((row, index) => ({ row, index })).filter((item) => item.row.method === "bank");

  return <div className="space-y-3">
    {error && <div role="alert" className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">{error}</div>}
    {message && <div className="rounded border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">{message}</div>}
    <section className="overflow-hidden rounded border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">Payment method name</h3>
        <p className="mt-0.5 text-xs text-slate-500">Names clients see, such as bKash or Nagad.</p>
      </div>
      <div className="space-y-2 p-4">
        {methods.length ? methods.map(({ row, index }) => <div key={index} className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <label><span className="crm-label">Type</span><select className="crm-input" value={row.method} onChange={(event) => update(index, "method", event.target.value)}><option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="cash">Cash</option></select></label>
          <label><span className="crm-label">Payment method name</span><input className="crm-input" maxLength={80} value={row.name} placeholder="bKash personal" onChange={(event) => update(index, "name", event.target.value)} /></label>
          <label><span className="crm-label">Account name</span><input className="crm-input" maxLength={120} value={row.accountName} onChange={(event) => update(index, "accountName", event.target.value)} /></label>
          <label><span className="crm-label">Account number</span><input className="crm-input" maxLength={80} value={row.accountNumber} onChange={(event) => update(index, "accountNumber", event.target.value)} /></label>
          <div className="sm:col-span-2 lg:col-span-4"><button type="button" className="crm-icon-button text-red-600" aria-label="Remove payment method" onClick={() => setRows((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="size-3.5" /></button></div>
        </div>) : <p className="text-sm text-slate-500">No payment method yet.</p>}
        <button type="button" disabled={rows.length >= 8} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50" onClick={() => setRows((current) => [...current, empty("bkash")])}><Plus className="size-3.5" />Add method</button>
      </div>
    </section>
    <section className="overflow-hidden rounded border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">Bank list</h3>
        <p className="mt-0.5 text-xs text-slate-500">Bank accounts clients can copy.</p>
      </div>
      <div className="space-y-2 p-4">
        {banks.length ? banks.map(({ row, index }) => <div key={index} className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
          {bankFields.map(([key, label]) => <label key={key}><span className="crm-label">{label}</span><input className="crm-input" maxLength={key === "routingNumber" ? 40 : key === "accountNumber" ? 80 : 120} value={row[key]} onChange={(event) => update(index, key, event.target.value)} /></label>)}
          <div className="sm:col-span-2"><button type="button" className="crm-icon-button text-red-600" aria-label="Remove bank account" onClick={() => setRows((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="size-3.5" /></button></div>
        </div>) : <p className="text-sm text-slate-500">No bank account yet.</p>}
        <button type="button" disabled={rows.length >= 8} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50" onClick={() => setRows((current) => [...current, empty("bank")])}><Plus className="size-3.5" />Add bank</button>
      </div>
    </section>
    <button type="button" disabled={busy} className="h-9 rounded-lg bg-[#1d4ed8] px-3 text-xs font-semibold text-white hover:bg-[#1e40af] disabled:opacity-50" onClick={() => void save()}>{busy ? "Saving..." : "Save payment methods"}</button>
  </div>;
}
