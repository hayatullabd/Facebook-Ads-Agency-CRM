import { isObjectId, validateObject } from "./common.validator.js";

const validDate = (value) => !Number.isNaN(Date.parse(value));
const accountReference = { type: "string", trim: true, maxLength: 160 };
const transactionFields = {
  invoice: { type: "string", custom: isObjectId },
  amount: { type: "number", required: true, min: 0.01 },
  method: { type: "string", enum: ["cash", "bank", "bkash", "nagad", "stripe", "manual"] },
  reference: accountReference,
  description: { type: "string", trim: true, maxLength: 1000 },
  transactionDate: { type: "string", custom: validDate },
};

export const validatePaymentAccountCreate = validateObject({
  client: { type: "string", required: true, custom: isObjectId },
  name: { type: "string", required: true, trim: true, maxLength: 120 },
  provider: { type: "string", trim: true, maxLength: 50 },
  accountReference,
  currency: { type: "string", enum: ["BDT", "USD", "INR"] },
  openingBalance: { type: "number", min: 0 },
  status: { type: "string", enum: ["active", "inactive"] },
  notes: { type: "string", maxLength: 1000 },
}, "body", true);

export const validatePaymentAccountUpdate = validateObject({
  name: { type: "string", trim: true, maxLength: 120 },
  provider: { type: "string", trim: true, maxLength: 50 },
  accountReference,
  status: { type: "string", enum: ["active", "inactive"] },
  notes: { type: "string", maxLength: 1000 },
}, "body", true);

export const validatePaymentTransactionCreate = validateObject({
  account: { type: "string", required: true, custom: isObjectId },
  type: { type: "string", required: true, enum: ["credit", "debit"] },
  ...transactionFields,
}, "body", true);

export const validatePaymentDepositCreate = validateObject(transactionFields, "body", true);
export const validatePaymentAdjustmentCreate = validateObject({
  type: { type: "string", required: true, enum: ["credit", "debit"] },
  ...transactionFields,
}, "body", true);
export const validatePaymentTransactionQuery = validateObject({
  account: { type: "string", custom: isObjectId },
  client: { type: "string", custom: isObjectId },
  type: { type: "string", enum: ["credit", "debit"] },
}, "query", true);
