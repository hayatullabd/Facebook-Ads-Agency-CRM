import { validateObject } from "./common.validator.js";

export const validateInvoiceCreate = validateObject({
  client: { required: true, type: "string" },
  adRequest: { required: true, type: "string" },
  pageName: { required: true, type: "string", minLength: 1 },
  objective: { required: true, type: "string", minLength: 1 },
  durationDays: { required: true, type: "number", min: 1 },
  rate: { required: true, type: "number", min: 1 },
  amount: { required: true, type: "number", min: 0 },
  dueDate: { required: true, type: "string" },
});
export const validatePayment = validateObject({ paymentMethod: { type: "string", enum: ["cash", "bank", "bkash", "nagad", "stripe", "manual", ""] } });
