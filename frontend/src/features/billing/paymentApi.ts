import { apiRequest } from "../../lib/api";

export interface PaymentAccount {
  _id: string;
  name: string;
  currency: string;
  balance: number;
  client?: { _id: string; name: string };
}

export interface PaymentTransaction {
  _id: string;
  type: "credit" | "debit";
  amount: number;
  currency: string;
  reference?: string;
  description?: string;
  transactionDate: string;
  balance?: number;
  account?: { _id: string; name: string };
  invoice?: { invoiceNumber: string } | null;
}

export const getPaymentAccounts = (agencyId: string) =>
  apiRequest<PaymentAccount[]>(`/payments/${agencyId}/accounts`);

export const getPaymentTransactions = (agencyId: string, account?: string) =>
  apiRequest<PaymentTransaction[]>(
    `/payments/${agencyId}/transactions${account ? `?account=${encodeURIComponent(account)}` : ""}`,
  );
