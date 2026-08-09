import Invoice from "../models/Invoice.model.js";
import AdRequest from "../models/AdRequest.model.js";
import Agency from "../models/Agency.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateId } from "../utils/generateId.js";

const updateFields = ["status", "dueDate", "notes"];
const pickInvoiceFields = (body, fields) => Object.fromEntries(
  fields.filter((field) => body[field] !== undefined).map((field) => [field, body[field]])
);

export const getInvoices = asyncHandler(async (req, res) => {
  const query = { agency: req.params.agencyId };
  if (["client", "moderator"].includes(req.user.role)) query.client = req.user.client;
  const invoices = await Invoice.find(query).populate("client adRequest").sort({ createdAt: -1 });
  res.json(new ApiResponse(200, invoices));
});

export const createInvoice = asyncHandler(async (req, res) => {
  const agencyId = req.params.agencyId;
  const [adRequest, agency] = await Promise.all([
    AdRequest.findOne({ _id: req.body.adRequest, agency: agencyId }).populate({
      path: "client",
      match: { agency: agencyId },
      select: "_id billingRate",
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
  const invoice = await Invoice.create({
    agency: agencyId,
    client: adRequest.client._id,
    adRequest: adRequest._id,
    invoiceNumber: generateId("INV"),
    pageName: adRequest.pageName,
    objective: adRequest.objective,
    budget: adRequest.budget.toObject(),
    durationDays: adRequest.durationDays,
    rate,
    amount: adRequest.budget.amount * adRequest.durationDays * rate,
    currency: agency.defaultCurrency,
    status: "Unpaid",
    dueDate: req.body.dueDate,
    notes: req.body.notes,
  });
  res.status(201).json(new ApiResponse(201, invoice, "Invoice created"));
});

export const updateInvoice = asyncHandler(async (req, res) => {
  const fields = pickInvoiceFields(req.body, updateFields);
  const existing = await Invoice.findOne({ _id: req.params.invoiceId, agency: req.params.agencyId }).select("status");
  if (!existing) throw new ApiError(404, "Invoice not found");
  if (existing.status === "Paid") throw new ApiError(409, "Paid invoices cannot be edited");
  const invoice = await Invoice.findOneAndUpdate(
    { _id: existing._id, agency: req.params.agencyId, status: { $ne: "Paid" } },
    fields,
    { new: true, runValidators: true }
  );
  if (!invoice) throw new ApiError(409, "Paid invoices cannot be edited");
  res.json(new ApiResponse(200, invoice, "Invoice updated"));
});

export const deleteInvoice = asyncHandler(async (req, res) => {
  const existing = await Invoice.findOne({ _id: req.params.invoiceId, agency: req.params.agencyId }).select("status");
  if (!existing) throw new ApiError(404, "Invoice not found");
  if (existing.status === "Paid") throw new ApiError(409, "Paid invoices cannot be deleted");
  const result = await Invoice.deleteOne({ _id: existing._id, agency: req.params.agencyId, status: { $ne: "Paid" } });
  if (!result.deletedCount) throw new ApiError(409, "Paid invoices cannot be deleted");
  res.json(new ApiResponse(200, null, "Invoice deleted"));
});

export const markInvoicePaid = asyncHandler(async (req, res) => {
  const existing = await Invoice.findOne({ _id: req.params.invoiceId, agency: req.params.agencyId }).select("status");
  if (!existing) throw new ApiError(404, "Invoice not found");
  if (existing.status === "Paid") throw new ApiError(409, "Invoice is already paid");
  const invoice = await Invoice.findOneAndUpdate(
    { _id: existing._id, agency: req.params.agencyId, status: { $ne: "Paid" } },
    { status: "Paid", paidAt: new Date(), paymentMethod: req.body.paymentMethod || "manual" },
    { new: true, runValidators: true }
  );
  if (!invoice) throw new ApiError(409, "Invoice is already paid");
  res.json(new ApiResponse(200, invoice, "Invoice marked as paid"));
});
