import Invoice from "../models/Invoice.model.js";
import AdRequest from "../models/AdRequest.model.js";
import Agency from "../models/Agency.model.js";
import PaymentAccount from "../models/PaymentAccount.model.js";
import PaymentTransaction from "../models/PaymentTransaction.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateId } from "../utils/generateId.js";

const updateFields = ["status", "dueDate", "notes", "discountAmount", "correctionAmount"];
const pickInvoiceFields = (body, fields) => Object.fromEntries(
  fields.filter((field) => body[field] !== undefined).map((field) => [field, body[field]])
);

function calculateInvoiceAmount(budget, durationDays, rate) {
  const budgetAmount = Number(budget?.amount) || 0;
  const billableDays = Number(durationDays) || 0;
  const billingRate = Number(rate) || 0;
  if (budget?.type === "daily") return budgetAmount * billableDays * billingRate;
  return budgetAmount * billingRate;
}

export const getInvoices = asyncHandler(async (req, res) => {
  const query = { agency: req.params.agencyId };
  if (["client", "moderator"].includes(req.user.role)) query.client = req.user.client;
  const invoices = await Invoice.find(query).populate("client", "name contactName").populate("adRequest", "requestNumber pageName").sort({ createdAt: -1 }).limit(3000).lean();
  res.json(new ApiResponse(200, invoices));
});

export const createInvoice = asyncHandler(async (req, res) => {
  const agencyId = req.params.agencyId;
  const [adRequest, agency] = await Promise.all([
    AdRequest.findOne({ _id: req.body.adRequest, agency: agencyId }).populate({
      path: "client",
      match: { agency: agencyId },
      select: "_id billingRate billingCurrency",
    }),
    Agency.findById(agencyId).select("defaultRate"),
  ]);
  if (!adRequest) throw new ApiError(404, "Ad request not found");
  if (!adRequest.client) throw new ApiError(404, "Client not found");
  if (String(adRequest.client._id) !== String(req.body.client)) {
    throw new ApiError(400, "Ad request does not belong to this client");
  }
  if (!["Approved", "Live"].includes(adRequest.status)) {
    throw new ApiError(409, "Invoices can only be created for approved or live ad requests");
  }
  if (!agency) throw new ApiError(404, "Agency not found");
  if (await Invoice.exists({ agency: agencyId, adRequest: adRequest._id })) {
    throw new ApiError(409, "An invoice already exists for this ad request");
  }

  const rate = adRequest.client.billingRate ?? agency.defaultRate;
  const discountAmount = Number(req.body.discountAmount) || 0;
  const correctionAmount = Number(req.body.correctionAmount) || 0;
  const baseAmount = calculateInvoiceAmount(adRequest.budget, adRequest.durationDays, rate);
  const amount = Math.max(0, baseAmount - discountAmount + correctionAmount);
  const invoice = await Invoice.create({
    agency: agencyId,
    client: adRequest.client._id,
    adRequest: adRequest._id,
    invoiceNumber: generateId("INV"),
    pageName: adRequest.pageName,
    objective: Array.isArray(adRequest.objective) ? adRequest.objective.join(", ") : adRequest.objective,
    budget: adRequest.budget.toObject(),
    durationDays: adRequest.durationDays,
    rate,
    amount,
    currency: adRequest.client.billingCurrency || "BDT",
    status: "Unpaid",
    dueDate: req.body.dueDate,
    discountAmount,
    correctionAmount,
    notes: req.body.notes,
  });
  res.status(201).json(new ApiResponse(201, invoice, "Invoice created"));
});

export const updateInvoice = asyncHandler(async (req, res) => {
  const fields = pickInvoiceFields(req.body, updateFields);
  const existing = await Invoice.findOne({ _id: req.params.invoiceId, agency: req.params.agencyId }).select("status budget durationDays rate amount discountAmount correctionAmount paidAmount");
  if (!existing) throw new ApiError(404, "Invoice not found");
  const discountAmount = fields.discountAmount !== undefined ? Number(fields.discountAmount) || 0 : Number(existing.discountAmount) || 0;
  const correctionAmount = fields.correctionAmount !== undefined ? Number(fields.correctionAmount) || 0 : Number(existing.correctionAmount) || 0;
  const recalculated = calculateInvoiceAmount(existing.budget, existing.durationDays, existing.rate);
  fields.amount = Math.max(0, recalculated - discountAmount + correctionAmount);
  const paidAmount = Number(existing.paidAmount) || 0;
  if (!fields.status && paidAmount > 0 && fields.amount <= paidAmount) {
    fields.status = "Paid";
    fields.paidAt = new Date();
    fields.paymentMethod = "advance";
  }
  if (fields.status === "Paid" && existing.status !== "Paid") {
    fields.paidAt = new Date();
    fields.paidAmount = fields.amount;
  }
  if (fields.status && fields.status !== "Paid" && existing.status === "Paid") fields.paidAt = null;
  const invoice = await Invoice.findOneAndUpdate(
    { _id: existing._id, agency: req.params.agencyId },
    fields,
    { new: true, runValidators: true }
  );
  if (!invoice) throw new ApiError(404, "Invoice not found");
  res.json(new ApiResponse(200, invoice, "Invoice updated"));
});

export const deleteInvoice = asyncHandler(async (req, res) => {
  const existing = await Invoice.findOne({ _id: req.params.invoiceId, agency: req.params.agencyId }).select("_id");
  if (!existing) throw new ApiError(404, "Invoice not found");
  const applied = await PaymentTransaction.find({ agency: req.params.agencyId, invoice: existing._id, type: "debit" }).select("account amount");
  for (const entry of applied) {
    await PaymentAccount.updateOne({ _id: entry.account, agency: req.params.agencyId }, { $inc: { balance: entry.amount } });
  }
  if (applied.length) await PaymentTransaction.deleteMany({ agency: req.params.agencyId, invoice: existing._id, type: "debit" });
  await PaymentTransaction.updateMany({ agency: req.params.agencyId, invoice: existing._id }, { $unset: { invoice: "" } });
  const result = await Invoice.deleteOne({ _id: existing._id, agency: req.params.agencyId });
  if (!result.deletedCount) throw new ApiError(404, "Invoice not found");
  res.json(new ApiResponse(200, null, "Invoice deleted"));
});

export const markInvoicePaid = asyncHandler(async (req, res) => {
  const existing = await Invoice.findOne({ _id: req.params.invoiceId, agency: req.params.agencyId }).select("status amount");
  if (!existing) throw new ApiError(404, "Invoice not found");
  if (existing.status === "Paid") throw new ApiError(409, "Invoice is already paid");
  const invoice = await Invoice.findOneAndUpdate(
    { _id: existing._id, agency: req.params.agencyId, status: { $ne: "Paid" } },
    { status: "Paid", paidAt: new Date(), paidAmount: existing.amount, paymentMethod: req.body.paymentMethod || "manual" },
    { new: true, runValidators: true }
  );
  if (!invoice) throw new ApiError(409, "Invoice is already paid");
  res.json(new ApiResponse(200, invoice, "Invoice marked as paid"));
});

export const downloadInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.invoiceId, agency: req.params.agencyId }).populate("client adRequest");
  if (!invoice) throw new ApiError(404, "Invoice not found");
  const lines = [
    "Invoice",
    `Invoice Number: ${invoice.invoiceNumber}`,
    `Client: ${invoice.client?.name || "-"}`,
    `Page: ${invoice.pageName}`,
    `Objective: ${invoice.objective}`,
    `Budget: ${invoice.budget?.amount || 0} ${invoice.budget?.currency || invoice.currency} / ${invoice.budget?.type || "daily"}`,
    `Duration: ${invoice.durationDays}`,
    `Rate: ${invoice.rate}`,
    `Discount: ${invoice.discountAmount || 0}`,
    `Correction: ${invoice.correctionAmount || 0}`,
    `Amount: ${invoice.amount}`,
    `Paid from advance: ${invoice.paidAmount || 0}`,
    `Status: ${invoice.status}`,
    `Due Date: ${invoice.dueDate ? new Date(invoice.dueDate).toISOString().slice(0, 10) : "-"}`,
  ];
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${invoice.invoiceNumber}.txt"`);
  res.send(lines.join("\n"));
});
