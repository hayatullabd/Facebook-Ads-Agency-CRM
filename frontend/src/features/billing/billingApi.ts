import { apiRequest } from "../../lib/api";
import type { Invoice } from "../../types/crm";

export const markInvoicePaid = (agencyId: string, invoiceId: string, paymentMethod = "manual") => {
  return apiRequest<Invoice>(`/invoices/${agencyId}/${invoiceId}/paid`, {
    method: "PATCH",
    body: JSON.stringify({ paymentMethod }),
  });
};
