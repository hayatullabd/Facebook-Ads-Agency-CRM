import { validateObject } from "./common.validator.js";

const planCreateRules = {
  name: { type: "string", required: true, trim: true, minLength: 2, maxLength: 120 },
  slug: { type: "string", required: true, trim: true, minLength: 2, maxLength: 120 },
  price: { type: "number", required: true, min: 0 },
  currency: { type: "string", required: false, enum: ["BDT", "USD", "INR"] },
  features: { type: "object", required: false },
  limits: { type: "object", required: false },
};

const planUpdateRules = {
  name: { type: "string", required: false, trim: true, minLength: 2, maxLength: 120 },
  slug: { type: "string", required: false, trim: true, minLength: 2, maxLength: 120 },
  price: { type: "number", required: false, min: 0 },
  currency: { type: "string", required: false, enum: ["BDT", "USD", "INR"] },
  features: { type: "object", required: false },
  limits: { type: "object", required: false },
};

const subscriptionCreateRules = {
  agency: { type: "string", required: true, trim: true, custom: (value) => /^[a-f\d]{24}$/i.test(value) },
  plan: { type: "string", required: true, trim: true, custom: (value) => /^[a-f\d]{24}$/i.test(value) },
};

const invoiceCreateRules = {
  agency: { type: "string", required: true, trim: true, custom: (value) => /^[a-f\d]{24}$/i.test(value) },
  amount: { type: "number", required: true, min: 0 },
  currency: { type: "string", required: true, enum: ["BDT", "USD", "INR"] },
  dueDate: { type: "string", required: true, trim: true, custom: (value) => !Number.isNaN(new Date(value).getTime()) },
  note: { type: "string", required: false, trim: true, maxLength: 300 },
};

export const validateSubscriptionInvoiceCreate = validateObject(invoiceCreateRules, "body", true);
export const validateSubscriptionPlanCreate = validateObject(planCreateRules, "body", true);
export const validateSubscriptionPlanUpdate = validateObject(planUpdateRules, "body", true);
export const validateSubscriptionCreate = validateObject(subscriptionCreateRules, "body", true);
