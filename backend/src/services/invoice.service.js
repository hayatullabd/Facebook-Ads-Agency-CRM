import Invoice from "../models/Invoice.model.js";
import Client from "../models/Client.model.js";
import { generateId } from "../utils/generateId.js";
import { ApiError } from "../utils/ApiError.js";

const PAYMENT_DUE_DAYS = 7;

const calculateBillableMedia = (budget, durationDays) => (
  budget.type === "daily" ? budget.amount * durationDays : budget.amount
);

/**
 * Creates exactly one request-scoped invoice for a Live ad request.
 * The unique { agency, adRequest } index makes this operation idempotent when
 * clients retry a status update or two workers process the same event.
 */
export const ensureLiveRequestInvoice = async ({ request }) => {
  const existing = await Invoice.findOne({ agency: request.agency, adRequest: request._id });
  if (existing) return { invoice: existing, created: false };

  const client = await Client.findOne({ _id: request.client, agency: request.agency }).select("billingRate name");
  if (!client) throw new ApiError(400, "Cannot create an invoice because the request client is unavailable");

  const mediaAmount = calculateBillableMedia(request.budget, request.durationDays);
  const isUsdBudget = request.budget.currency === "USD";
  const rate = isUsdBudget ? client.billingRate : 1;
  const amount = Number((mediaAmount * rate).toFixed(2));
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + PAYMENT_DUE_DAYS);

  try {
    const invoice = await Invoice.create({
      agency: request.agency,
      client: request.client,
      adRequest: request._id,
      invoiceNumber: generateId("INV"),
      pageName: request.pageName,
      objective: request.objective,
      budget: request.budget,
      durationDays: request.durationDays,
      rate,
      amount,
      currency: isUsdBudget ? "BDT" : request.budget.currency,
      dueDate,
      notes: `Auto-created when ${request.requestNumber} went Live.`,
    });
    return { invoice, created: true };
  } catch (error) {
    if (error?.code === 11000) {
      const invoice = await Invoice.findOne({ agency: request.agency, adRequest: request._id });
      if (invoice) return { invoice, created: false };
    }
    throw error;
  }
};
