import { ApiError } from "../utils/ApiError.js";

export function calculateInvoiceAmount(budget, durationDays, rate) {
  if (!budget || !["daily", "lifetime"].includes(budget.type)
    || !Number.isFinite(budget.amount) || budget.amount < 1
    || !Number.isInteger(durationDays) || durationDays < 1 || durationDays > 365
    || !Number.isFinite(rate) || rate < 1) throw new ApiError(400, "Invalid invoice calculation inputs");
  const amount = budget.amount * (budget.type === "daily" ? durationDays : 1) * rate;
  if (!Number.isFinite(amount) || amount > 1_000_000_000) throw new ApiError(400, "Invoice amount exceeds the supported limit");
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}
