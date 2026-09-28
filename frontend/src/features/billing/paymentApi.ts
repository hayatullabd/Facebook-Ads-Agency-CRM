import { apiBlob, apiRequest } from "../../lib/api";

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
  method?: string;
  reference?: string;
  description?: string;
  transactionDate: string;
  balance?: number;
  hasScreenshot?: boolean;
  account?: { _id: string; name: string };
  invoice?: { invoiceNumber: string } | null;
}

export interface AgencyPaymentDetail {
  method: "bkash" | "nagad" | "bank" | "cash";
  name: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  branchName: string;
  routingNumber: string;
}

export const getPaymentAccounts = (agencyId: string) =>
  apiRequest<PaymentAccount[]>(`/payments/${agencyId}/accounts`);

export const recordClientAdvance = (
  agencyId: string,
  payload: { client: string; amount: number; currency?: string; method?: string; reference?: string; description?: string; transactionDate?: string; screenshot?: string },
) => apiRequest<PaymentTransaction>(`/payments/${agencyId}/advances`, { method: "POST", body: JSON.stringify(payload) });

export const updateClientPayment = (
  agencyId: string,
  transactionId: string,
  payload: { amount?: number; method?: string; reference?: string; description?: string; transactionDate?: string; screenshot?: string },
) => apiRequest<PaymentTransaction>(`/payments/${agencyId}/transactions/${transactionId}`, { method: "PATCH", body: JSON.stringify(payload) });

export const applyClientAdvance = (agencyId: string, invoiceId: string, amount?: number) =>
  apiRequest<{ applied: number; balance: number }>(`/payments/${agencyId}/advances/apply`, {
    method: "POST",
    body: JSON.stringify({ invoice: invoiceId, ...(amount ? { amount } : {}) }),
  });

export const openPaymentScreenshot = async (agencyId: string, transactionId: string) => {
  const blob = await apiBlob(`/payments/${agencyId}/transactions/${transactionId}/screenshot`);
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export const getPaymentTransactions = (agencyId: string, account?: string) =>
  apiRequest<PaymentTransaction[]>(
    `/payments/${agencyId}/transactions${account ? `?account=${encodeURIComponent(account)}` : ""}`,
  );

export const getAgencyPaymentDetails = (agencyId: string) =>
  apiRequest<AgencyPaymentDetail[]>(`/agency/${agencyId}/payment-details`);

export const saveAgencyPaymentDetails = (agencyId: string, paymentDetails: AgencyPaymentDetail[]) =>
  apiRequest<AgencyPaymentDetail[]>(`/agency/${agencyId}/payment-details`, {
    method: "PUT",
    body: JSON.stringify({ paymentDetails }),
  });
