import { apiRequest } from "../../lib/api";
import type { Invoice, InvoiceStatus } from "../../types/crm";

export type CreateInvoicePayload = { client: string; adRequest: string; dueDate: string; notes?: string; discountAmount?: number; correctionAmount?: number };
export type UpdateInvoicePayload = { status?: InvoiceStatus; dueDate?: string; notes?: string; discountAmount?: number; correctionAmount?: number };
export const createInvoice = (agencyId: string, payload: CreateInvoicePayload) => apiRequest<Invoice>(`/invoices/${agencyId}`, { method: "POST", body: JSON.stringify(payload) });
export const updateInvoice = (agencyId: string, id: string, payload: UpdateInvoicePayload) => apiRequest<Invoice>(`/invoices/${agencyId}/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const deleteInvoice = (agencyId: string, id: string) => apiRequest<null>(`/invoices/${agencyId}/${id}`, { method: "DELETE" });
export const getInvoiceDownloadUrl = (agencyId: string, invoiceId: string) => `${import.meta.env.VITE_API_URL ?? "http://localhost:5001/api"}/invoices/${agencyId}/${invoiceId}/download`;


export const markInvoicePaid = (agencyId: string, invoiceId: string, paymentMethod = "manual") => {
  return apiRequest<Invoice>(`/invoices/${agencyId}/${invoiceId}/paid`, {
    method: "PATCH",
    body: JSON.stringify({ paymentMethod }),
  });
};
