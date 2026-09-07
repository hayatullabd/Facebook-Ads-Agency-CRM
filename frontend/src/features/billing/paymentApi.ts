import { apiRequest } from "../../lib/api";

export interface PaymentAccount {
  _id: string;
  name: string;
  currency: string;
  balance: number;
  status?: "active" | "inactive";
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

export const createPaymentAccount = (agencyId: string, payload: { client: string; name: string; currency: string; openingBalance: number }) => apiRequest<PaymentAccount>(`/payments/${agencyId}/accounts`, { method: "POST", body: JSON.stringify(payload) });
export const createPaymentTransaction = (agencyId: string, payload: { account: string; type: "credit" | "debit"; amount: number; reference: string; description: string; invoice?: string; idempotencyKey: string }) => apiRequest<PaymentTransaction>(`/payments/${agencyId}/transactions`, { method: "POST", body: JSON.stringify(payload) });
