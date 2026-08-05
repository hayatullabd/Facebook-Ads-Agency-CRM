import { isObjectId, validateObject } from "./common.validator.js";

const validDate = (value) => !Number.isNaN(Date.parse(value));
const budgetRule = {
  required: true,
  type: "object",
  custom: (value) => {
    if (!value || Array.isArray(value)) return false;
    if (Object.keys(value).some((field) => !["amount", "type", "currency"].includes(field))) return false;
    return typeof value.amount === "number" && Number.isFinite(value.amount) && value.amount >= 1
      && ["daily", "lifetime"].includes(value.type)
      && ["USD", "BDT", "INR"].includes(value.currency);
  },
};

export const validateInvoiceCreate = validateObject({
  client: { required: true, type: "string", custom: isObjectId },
  adRequest: { required: true, type: "string", custom: isObjectId },
  pageName: { required: true, type: "string", minLength: 1 },
  objective: { required: true, type: "string", minLength: 1 },
  budget: budgetRule,
  durationDays: { required: true, type: "number", min: 1 },
  rate: { required: true, type: "number", min: 1 },
  amount: { required: true, type: "number", min: 0 },
  currency: { type: "string", enum: ["BDT", "USD", "INR"] },
  status: { type: "string", enum: ["Unpaid", "Overdue"] },
  dueDate: { required: true, type: "string", custom: validDate },
  notes: { type: "string", maxLength: 1000 },
});
export const validateInvoiceUpdate = validateObject({
  client: { type: "string", custom: isObjectId },
  adRequest: { type: "string", custom: isObjectId },
  amount: { type: "number", min: 0 },
  currency: { type: "string", enum: ["BDT", "USD", "INR"] },
  status: { type: "string", enum: ["Unpaid", "Paid", "Overdue"] },
  dueDate: { type: "string", custom: validDate },
}, "body", true);
export const validatePayment = validateObject({ paymentMethod: { type: "string", enum: ["cash", "bank", "bkash", "nagad", "stripe", "manual", ""] } });
