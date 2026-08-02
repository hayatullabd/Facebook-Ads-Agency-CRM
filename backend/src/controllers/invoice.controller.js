import Invoice from "../models/Invoice.model.js";
import { validateClientAndRequest } from "../utils/validateTenantRelations.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateId } from "../utils/generateId.js";

const createFields = ["client", "adRequest", "pageName", "objective", "budget", "durationDays", "rate", "amount", "currency", "status", "dueDate", "notes"];
const pickInvoiceFields = (body) => Object.fromEntries(
  createFields.filter((field) => body[field] !== undefined).map((field) => [field, body[field]])
);

export const getInvoices = asyncHandler(async (req, res) => {
  const query = { agency: req.params.agencyId };
  if (["client", "moderator"].includes(req.user.role)) query.client = req.user.client;
  const invoices = await Invoice.find(query).populate("client adRequest").sort({ createdAt: -1 });
  res.json(new ApiResponse(200, invoices));
});

export const createInvoice = asyncHandler(async (req, res) => {
  await validateClientAndRequest({ agencyId: req.params.agencyId, clientId: req.body.client, adRequestId: req.body.adRequest });
  const invoice = await Invoice.create({
    ...pickInvoiceFields(req.body),
    agency: req.params.agencyId,
    invoiceNumber: generateId("INV"),
  });
  res.status(201).json(new ApiResponse(201, invoice, "Invoice created"));
});

export const markInvoicePaid = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOneAndUpdate(
    { _id: req.params.invoiceId, agency: req.params.agencyId },
    { status: "Paid", paidAt: new Date(), paymentMethod: req.body.paymentMethod || "manual" },
    { new: true, runValidators: true }
  );
  if (!invoice) throw new ApiError(404, "Invoice not found");
  res.json(new ApiResponse(200, invoice, "Invoice marked as paid"));
});
