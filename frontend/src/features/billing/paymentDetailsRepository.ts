import type { Invoice } from "../../types/crm";

export interface PaymentLedgerEntry {
  id: string;
  date: string;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
  currency: string;
}

export function buildPaymentLedger(invoices: Invoice[]): PaymentLedgerEntry[] {
  const entries = [...invoices]
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
    .map((invoice) => ({
      id: invoice._id,
      date: invoice.createdAt,
      description: `${invoice.pageName} · ${invoice.objective}`,
      reference: `${invoice.invoiceNumber}${invoice.paymentMethod ? ` · ${invoice.paymentMethod}` : ""}`,
      debit: invoice.amount,
      credit: invoice.status === "Paid" ? invoice.amount : 0,
      currency: invoice.currency,
    }));

  const balances = new Map<string, number>();
  return entries.map((entry) => {
    const balance = (balances.get(entry.currency) || 0) + entry.debit - entry.credit;
    balances.set(entry.currency, balance);
    return { ...entry, balance };
  });
}
