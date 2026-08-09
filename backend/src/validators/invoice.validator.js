import { isObjectId, validateObject } from "./common.validator.js";

const validDate = (value) => !Number.isNaN(Date.parse(value));

export const validateInvoiceCreate = validateObject({
  client: { required: true, type: "string", custom: isObjectId },
  adRequest: { required: true, type: "string", custom: isObjectId },
  dueDate: { required: true, type: "string", custom: validDate },
  notes: { type: "string", maxLength: 1000 },
}, "body", true);
export const validateInvoiceUpdate = validateObject({
  status: { type: "string", enum: ["Unpaid", "Overdue"] },
  dueDate: { type: "string", custom: validDate },
  notes: { type: "string", maxLength: 1000 },
}, "body", true);
export const validatePayment = validateObject({ paymentMethod: { type: "string", enum: ["cash", "bank", "bkash", "nagad", "stripe", "manual", ""] } });
