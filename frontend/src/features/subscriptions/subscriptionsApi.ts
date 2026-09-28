import { apiRequest } from "../../lib/api";

export interface SubscriptionPlan { _id: string; name: string; slug: string; interval: "monthly"; price: number; currency: "BDT" | "USD" | "INR"; features: string[]; limits?: { clients?: number }; isActive: boolean }
export interface Subscription { _id: string; agency: string; plan: SubscriptionPlan; status: "trialing" | "active" | "past_due" | "paused" | "canceled" | "expired"; startAt: string; trialEndsAt?: string | null; currentPeriodEnd?: string | null; renewalAt?: string | null; cancelAtPeriodEnd: boolean; autoRenew: boolean }

export const getSubscriptionPlans = () => apiRequest<SubscriptionPlan[]>("/subscriptions/plans");
export const createSubscriptionPlan = (payload: { name: string; slug: string; price: number; currency: "BDT" | "USD" | "INR"; limits: { clients: number } }) => apiRequest<SubscriptionPlan>("/subscriptions/plans", { method: "POST", body: JSON.stringify(payload) });
export const updateSubscriptionPlan = (planId: string, payload: { name: string; slug: string; price: number; currency: "BDT" | "USD" | "INR"; limits: { clients: number } }) => apiRequest<SubscriptionPlan>(`/subscriptions/plans/${planId}`, { method: "PATCH", body: JSON.stringify(payload) });
export const deleteSubscriptionPlan = (planId: string) => apiRequest<null>(`/subscriptions/plans/${planId}`, { method: "DELETE" });

export interface PlatformInvoice { _id: string; invoiceNumber: string; agencyId: string; agencyName: string; amount: number; currency: "BDT" | "USD" | "INR"; status: "Unpaid" | "Paid" | "Overdue"; dueDate: string; paidAt?: string | null; note: string }
export const getPlatformInvoices = () => apiRequest<PlatformInvoice[]>("/subscriptions/invoices");
export const createPlatformInvoice = (payload: { agency: string; amount: number; currency: PlatformInvoice["currency"]; dueDate: string; note?: string }) => apiRequest<PlatformInvoice>("/subscriptions/invoices", { method: "POST", body: JSON.stringify(payload) });
export const markPlatformInvoicePaid = (invoiceId: string) => apiRequest<PlatformInvoice>(`/subscriptions/invoices/${invoiceId}/paid`, { method: "POST" });
export const deletePlatformInvoice = (invoiceId: string) => apiRequest<null>(`/subscriptions/invoices/${invoiceId}`, { method: "DELETE" });
export const getAgencySubscriptions = (agencyId: string) => apiRequest<Subscription[]>(`/subscriptions/${agencyId}`);
export const getSubscriptionSummary = (agencyId: string) => apiRequest<{ subscriptions: Subscription[]; active: number }>(`/subscriptions/${agencyId}/summary`);
export const createAgencySubscription = (agencyId: string, plan: string) => apiRequest<Subscription>(`/subscriptions/${agencyId}`, { method: "POST", body: JSON.stringify({ agency: agencyId, plan }) });
export const cancelAgencySubscription = (agencyId: string, subscriptionId: string) => apiRequest<Subscription>(`/subscriptions/${agencyId}/${subscriptionId}/cancel`, { method: "POST" });
export const resumeAgencySubscription = (agencyId: string, subscriptionId: string) => apiRequest<Subscription>(`/subscriptions/${agencyId}/${subscriptionId}/resume`, { method: "POST" });
