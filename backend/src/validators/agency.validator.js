import { validateObject } from "./common.validator.js";

export const validateAgencyUpdate = validateObject({
  name: { type: "string", minLength: 2, maxLength: 120 },
  logoUrl: { type: "string", maxLength: 500 },
  defaultCurrency: { type: "string", enum: ["BDT", "USD", "INR"] },
  defaultRate: { type: "number", min: 1 },
  onboardingCompleted: { type: "boolean" },
});
export const validateFacebookCredential = validateObject({
  accessToken: { required: true, type: "string", minLength: 1, maxLength: 4096 },
  defaultAdAccountId: { type: "string", custom: (value) => !value || /^act_\d+$/.test(value) || /^\d+$/.test(value) },
});
export const validateFacebookDisconnect = validateObject({
  revokeRemote: { type: "boolean" },
});

const textField = (value, max, required = true) => {
  if (value == null || value === "") return !required;
  return typeof value === "string" && value.trim().length <= max && (!required || value.trim().length > 0);
};
const paymentMethods = ["bkash", "nagad", "bank", "cash"];
export const validateAgencyPaymentDetails = validateObject({
  paymentDetails: {
    required: true,
    custom: (value) => Array.isArray(value) && value.length <= 8 && value.every((item) => {
      if (!item || typeof item !== "object" || !paymentMethods.includes(item.method)) return false;
      if (item.method === "bank") {
        return textField(item.accountName, 120) && textField(item.accountNumber, 80) && textField(item.bankName, 120) && textField(item.branchName, 120) && textField(item.routingNumber, 40);
      }
      return textField(item.name, 80) && textField(item.accountName, 120) && textField(item.accountNumber, 80);
    }),
  },
}, "body", true);
