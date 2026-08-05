import Invoice from "../models/Invoice.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateId } from "../utils/generateId.js";
import { validateClientAndAdRequest } from "../services/referenceValidation.service.js";

const createFields = ["client", "adRequest", "pageName", "objective", "budget", "durationDays", "rate", "amount", "currency", "status", "dueDate", "notes"];
const updateFields = ["client", "adRequest", "amount", "currency", "status", "dueDate"];
const pickInvoiceFields = (body, fields = createFields) => Object.fromEntries(
  fields.filter((field) => body[field] !== undefined).map((field) => [field, body[field]])
);

export const getInvoices = asyncHandler(async (req, res) => {
  const query = { agency: req.params.agencyId };
  if (["client", "moderator"].includes(req.user.role)) query.client = req.user.client;
  const invoices = await Invoice.find(query).populate("client adRequest").sort({ createdAt: -1 });
  res.json(new ApiResponse(200, invoices));
});

export const createInvoice = asyncHandler(async (req, res) => {
  const fields = pickInvoiceFields(req.body);
  await validateClientAndAdRequest({ agencyId: req.params.agencyId, clientId: fields.client, adRequestId: fields.adRequest });
  const invoice = await Invoice.create({
    ...fields,
    agency: req.params.agencyId,
    invoiceNumber: generateId("INV"),
  });
  res.status(201).json(new ApiResponse(201, invoice, "Invoice created"));
});

export const updateInvoice = asyncHandler(async (req, res) => {
  const fields = pickInvoiceFields(req.body, updateFields);
  const existing = await Invoice.findOne({ _id: req.params.invoiceId, agency: req.params.agencyId }).select("client adRequest status");
  if (!existing) throw new ApiError(404, "Invoice not found");
  if (existing.status === "Paid") throw new ApiError(409, "Paid invoices cannot be edited");
  if (fields.status === "Paid") throw new ApiError(409, "Use the dedicated mark-paid route to mark an invoice as paid");
  if (fields.client !== undefined || fields.adRequest !== undefined) {
    await validateClientAndAdRequest({
      agencyId: req.params.agencyId,
      clientId: fields.client ?? existing.client,
      adRequestId: fields.adRequest ?? existing.adRequest,
    });
  }
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
