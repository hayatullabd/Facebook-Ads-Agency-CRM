import { apiRequest } from "../../lib/api";

export interface AdAccountListItem { accountId: string; numericAccountId: string; name: string; currency: string; timezoneName: string; status: { code: number | null; label: string }; cachedSummary?: { balance?: Money; lifetimeSpend?: Money; spendCap?: Money; fetchedAt?: string } | null }
export interface Money { minor: string; amount: string; currency: string; exponent: number | null }
export interface AdAccountDetail {
  account: { accountId: string; numericAccountId: string; name: string; currency: string; timezoneName: string; status: { code: number | null; label: string }; disableReason: { code: number | null; label: string }; balance: Money; lifetimeSpend: Money; spendCap: Money };
  periods: { today: { date: string; amount: string }; yesterday: { date: string; amount: string }; mtd: { from: string; to: string; amount: string }; currency: string };
  selectedDate: string;
  optimizationSpend: Array<{ goal: string; amount: string; currency: string }>;
  activeBudget: Array<{ goal: string; amount: string; currency: string; budgetType: string; source?: string }>;
  budgetExclusions?: { lifetimeBudgetCount: number };
  capabilities: { funding: { status: string; reason: string | null; displayType: string | null; last4: string | null }; billing: { status: string; reason: string }; spendCapWrite: { status: string; reason: string | null } };
  links: { billing: string; campaigns: string };
  partialErrors: Array<{ category: string; message: string }>;
  stale: boolean;
  fetchedAt: string;
}
export interface SpendCapPreview { operation: string; currency: string; current: string; amount: string; change: string; target: string; accountId: string; confirmationToken: string }
export interface SpendCapResult { verified: boolean; accountId: string; operation: string; currency: string; old: string; change: string; target: string; appliedAt: string }

export const getAdAccounts = (agencyId: string) => apiRequest<AdAccountListItem[]>(`/ad-accounts/${agencyId}`);
export const getAdAccountDetail = (agencyId: string, accountId: string, date: string, refresh = false) => apiRequest<AdAccountDetail>(`/ad-accounts/${agencyId}/${accountId}?date=${encodeURIComponent(date)}&refresh=${refresh ? "1" : "0"}`);
export const previewSpendCap = (agencyId: string, accountId: string, operation: string, amount: string) => apiRequest<SpendCapPreview>(`/ad-accounts/${agencyId}/${accountId}/spend-cap/preview`, { method: "POST", body: JSON.stringify({ operation, amount }) });
export const applySpendCap = (agencyId: string, accountId: string, operation: string, amount: string, confirmationToken: string, idempotencyKey: string) => apiRequest<SpendCapResult>(`/ad-accounts/${agencyId}/${accountId}/spend-cap`, { method: "PUT", headers: { "Idempotency-Key": idempotencyKey }, body: JSON.stringify({ operation, amount, confirmationToken }) });
