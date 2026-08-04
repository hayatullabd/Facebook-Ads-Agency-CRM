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
