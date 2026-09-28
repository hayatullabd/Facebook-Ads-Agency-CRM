import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import type { Client, Invoice } from "../../types/crm";
import { formatMoney } from "../../lib/formatters";
import { Button } from "../shared/Button";
import { Card } from "../shared/Card";
import { PaymentDetailCards, paymentDetailTitle } from "./AgencyPaymentDetails";
import { getAgencyPaymentDetails, type AgencyPaymentDetail, type PaymentAccount } from "./paymentApi";

type Payload = {
  client: string;
  amount: number;
  currency: "BDT" | "USD" | "INR";
  method: string;
  reference?: string;
  description?: string;
  transactionDate?: string;
  screenshot?: string;
};

export type EditablePayment = {
  id: string;
  amount: number;
  currency: "BDT" | "USD" | "INR";
  method: string;
  reference: string;
  description: string;
  transactionDate: string;
  hasScreenshot: boolean;
};

export function AdvancePaymentDialog({
  open,
  clients,
  invoices,
  accounts,
  lockedClientId,
  agencyId,
  onClose,
  onRecord,
  onApply,
  editing,
  onUpdate,
  lockedInvoice,
}: {
  open: boolean;
  clients: Client[];
  invoices: Invoice[];
  accounts: PaymentAccount[];
  lockedClientId?: string;
  agencyId: string;
  onClose: () => void;
  onRecord: (payload: Payload) => Promise<void>;
  onApply?: (invoiceId: string, amount?: number) => Promise<void>;
  editing?: EditablePayment | null;
  onUpdate?: (id: string, payload: { amount: number; method: string; reference?: string; description?: string; transactionDate?: string; screenshot?: string }) => Promise<void>;
  lockedInvoice?: Invoice | null;
}) {
  const [clientId, setClientId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"BDT" | "USD" | "INR">("BDT");
  const [methodIndex, setMethodIndex] = useState(0);
  const [methodTouched, setMethodTouched] = useState(false);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");
  const [screenshot, setScreenshot] = useState("");
  const [paymentDetails, setPaymentDetails] = useState<AgencyPaymentDetail[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const ownClient = clients.find((item) => item._id === (lockedClientId || clientId));
  const payableInvoices = invoices.filter((item) => item.status !== "Paid" && (!lockedClientId || item.client?._id === lockedClientId));
  const advanceBalance = accounts
    .filter((account) => account.name.startsWith("Advance") && account.client?._id === (lockedClientId || clientId) && account.currency === currency)
    .reduce((sum, account) => sum + account.balance, 0);

  useEffect(() => {
    if (!open) return;
    setInvoiceId("");
    setScreenshot("");
    setMethodTouched(false);
    setError("");
    if (editing) {
      setAmount(String(editing.amount));
      setCurrency(editing.currency);
      setReference(editing.reference === "—" ? "" : editing.reference);
      setNote(editing.description);
      setDate(editing.transactionDate.slice(0, 10));
      return;
    }
    if (lockedInvoice) {
      const invoiceCurrency = lockedInvoice.currency === "USD" || lockedInvoice.currency === "INR" ? lockedInvoice.currency : "BDT";
      setClientId((typeof lockedInvoice.client === "string" ? lockedInvoice.client : lockedInvoice.client?._id) || "");
      setAmount("");
      setCurrency(invoiceCurrency);
      setMethodIndex(0);
      setReference("");
      setNote("");
      setDate(new Date().toISOString().slice(0, 10));
      return;
    }
    const match = clients.find((item) => item._id === lockedClientId);
    setClientId(lockedClientId || "");
    setAmount("");
    setCurrency(match?.billingCurrency || "BDT");
    setMethodIndex(0);
    setReference("");
    setNote("");
    setDate(new Date().toISOString().slice(0, 10));
  }, [open, lockedClientId, clients, editing, lockedInvoice]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    getAgencyPaymentDetails(agencyId).then((details) => {
      if (!active) return;
      const next = details.map((item) => ({ ...item, method: item.method || "bank" }));
      setPaymentDetails(next);
      const matched = editing ? next.findIndex((item) => item.method === editing.method) : 0;
      setMethodIndex(matched >= 0 ? matched : 0);
    }).catch(() => { if (active) setPaymentDetails([]); });
    return () => { active = false; };
  }, [open, agencyId, editing]);

  if (!open) return null;

  const chooseInvoice = (nextId: string) => {
    setInvoiceId(nextId);
    const invoice = payableInvoices.find((item) => item._id === nextId);
    if (!invoice) return;
    const due = Math.max(0, invoice.amount - (invoice.paidAmount || 0));
    setCurrency((invoice.currency === "USD" || invoice.currency === "INR" ? invoice.currency : "BDT"));
    setAmount(due ? String(due) : "");
  };

  const chooseScreenshot = (file?: File) => {
    if (!file) { setScreenshot(""); return; }
    if (!file.type.startsWith("image/")) { setError("Screenshot must be an image"); return; }
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, 1280 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (!context) { setError("Could not read the screenshot"); URL.revokeObjectURL(url); return; }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL("image/jpeg", 0.72);
      URL.revokeObjectURL(url);
      if (data.length > 1_400_000) { setScreenshot(""); setError("Screenshot is too large. Use a smaller image."); return; }
      setError("");
      setScreenshot(data);
    };
    image.onerror = () => { URL.revokeObjectURL(url); setError("Use a JPG, PNG, or WebP screenshot"); };
    image.src = url;
  };

  const matchedMethod = editing ? paymentDetails.findIndex((item) => item.method === editing.method) : -1;
  const selected = paymentDetails[methodIndex];
  const method = !methodTouched && editing ? editing.method : (selected?.method || editing?.method || "");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const payer = lockedClientId || clientId;
    if (!method || (!editing && !lockedInvoice && !payer)) return;
    setBusy(true);
    setError("");
    try {
      if (editing && onUpdate) {
        await onUpdate(editing.id, {
          amount: Number(amount),
          method,
          reference,
          description: note.trim() || "Advance payment",
          transactionDate: date || undefined,
          ...(screenshot ? { screenshot } : {}),
        });
        onClose();
        return;
      }
      const invoiceClientId = typeof lockedInvoice?.client === "string" ? lockedInvoice.client : lockedInvoice?.client?._id;
      const payingClient = invoiceClientId || payer;
      if (!payingClient) return;
      const partialDue = lockedInvoice ? Math.max(0, lockedInvoice.amount - (lockedInvoice.paidAmount || 0)) : 0;
      if (lockedInvoice && Number(amount) - partialDue > 0.009) {
        setError(`Amount cannot be more than the due ${formatMoney(partialDue, lockedInvoice.currency)}`);
        setBusy(false);
        return;
      }
      await onRecord({
        client: payingClient,
        amount: Number(amount),
        currency,
        method,
        reference,
        description: note.trim() || (lockedInvoice ? `Partial payment for ${lockedInvoice.invoiceNumber}` : "Advance payment"),
        transactionDate: date || undefined,
        ...(screenshot ? { screenshot } : {}),
      });
      if (lockedInvoice && onApply) await onApply(lockedInvoice._id, Number(amount));
      else if (invoiceId && onApply) await onApply(invoiceId);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not record payment");
    } finally {
      setBusy(false);
    }
  };

  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <Card className="w-full max-w-lg" role="dialog" aria-modal="true" aria-labelledby="advance-title">
      <div className="flex items-center justify-between border-b border-slate-200 p-4"><h3 id="advance-title" className="font-semibold text-slate-900">{editing ? "Edit payment" : lockedInvoice ? "Partial payment" : lockedClientId ? "Make payment" : "Advance payment"}</h3><button type="button" className="crm-icon-button" onClick={onClose} aria-label="Close"><X className="size-4" /></button></div>
      <form onSubmit={submit} className="grid gap-3 p-4 sm:grid-cols-2">
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{error}</div>}
        {lockedInvoice && <div className="sm:col-span-2"><p className="crm-label">Invoice</p><p className="text-sm font-medium text-slate-800">{lockedInvoice.invoiceNumber} · due {formatMoney(Math.max(0, lockedInvoice.amount - (lockedInvoice.paidAmount || 0)), lockedInvoice.currency)}</p><p className="mt-1 text-xs text-slate-500">Enter less than the due amount to leave the rest unpaid.</p></div>}
        {!editing && !lockedInvoice && (lockedClientId ? <div className="sm:col-span-2"><p className="crm-label">Client</p><p className="text-sm font-medium text-slate-800">{ownClient?.name || "Your account"}</p></div> : <label className="sm:col-span-2"><span className="crm-label">Client</span><select required className="crm-input" value={clientId} onChange={(event) => { const next = event.target.value; setClientId(next); const match = clients.find((item) => item._id === next); setCurrency(match?.billingCurrency || "BDT"); }}><option value="">Select client</option>{clients.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>)}
        {!editing && !lockedInvoice && lockedClientId && <label className="sm:col-span-2"><span className="crm-label">Apply to invoice</span><select className="crm-input" value={invoiceId} onChange={(event) => chooseInvoice(event.target.value)}><option value="">Keep as advance</option>{payableInvoices.map((item) => <option key={item._id} value={item._id}>{item.invoiceNumber} · due {formatMoney(Math.max(0, item.amount - (item.paidAmount || 0)), item.currency)}</option>)}</select></label>}
        <label><span className="crm-label">Amount</span><input required type="number" min="0.01" step="0.01" max={lockedInvoice ? Math.max(0.01, lockedInvoice.amount - (lockedInvoice.paidAmount || 0)) : undefined} className="crm-input" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
        <label><span className="crm-label">Currency</span><select className="crm-input" value={currency} disabled={Boolean(editing || invoiceId || lockedInvoice)} onChange={(event) => setCurrency(event.target.value as "BDT" | "USD" | "INR")}>{["BDT", "USD", "INR"].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="sm:col-span-2"><span className="crm-label">Method</span>{paymentDetails.length || editing ? <select required className="crm-input" value={methodTouched ? String(methodIndex) : matchedMethod >= 0 ? String(matchedMethod) : "keep"} onChange={(event) => { const next = Number(event.target.value); if (Number.isNaN(next)) return; setMethodTouched(true); setMethodIndex(next); }}>{editing && matchedMethod < 0 && <option value="keep">{editing.method}</option>}{paymentDetails.map((item, index) => <option key={`${item.accountNumber}-${index}`} value={index}>{paymentDetailTitle(item)}</option>)}</select> : <p className="text-sm text-slate-500">No payment method has been added yet.</p>}</label>
        {((!methodTouched && matchedMethod >= 0 ? paymentDetails[matchedMethod] : selected)?.accountNumber) && <div className="sm:col-span-2"><p className="crm-label">Pay to this account</p><PaymentDetailCards details={[!methodTouched && matchedMethod >= 0 ? paymentDetails[matchedMethod] : selected]} /></div>}
        <label><span className="crm-label">Date</span><input required type="date" className="crm-input" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label className="sm:col-span-2"><span className="crm-label">Reference</span><input className="crm-input" maxLength={160} value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Txn id or receipt" /></label>
        <label className="sm:col-span-2"><span className="crm-label">Note</span><input className="crm-input" maxLength={300} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Advance payment" /></label>
        <label className="sm:col-span-2"><span className="crm-label">{editing ? "Replace screenshot" : "Payment screenshot"}</span><input type="file" accept="image/png,image/jpeg,image/webp" className="block w-full text-sm text-slate-600" onChange={(event) => chooseScreenshot(event.target.files?.[0])} />{editing?.hasScreenshot && !screenshot && <span className="mt-1 block text-xs text-slate-500">The current screenshot stays unless you upload a new one.</span>}</label>
        {screenshot && <img src={screenshot} alt="Payment screenshot preview" className="max-h-36 rounded border border-slate-200 sm:col-span-2" />}
        {(lockedClientId || clientId) && <p className="text-xs text-slate-500 sm:col-span-2">Current {currency} advance: {formatMoney(advanceBalance, currency)}</p>}
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 sm:col-span-2"><button type="button" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={onClose}>Cancel</button><Button disabled={busy || !method}>{busy ? "Saving..." : editing ? "Save changes" : lockedInvoice ? "Pay partial" : "Record payment"}</Button></div>
      </form>
    </Card>
  </div>;
}
