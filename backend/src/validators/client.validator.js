import { isObjectId, validateObject } from "./common.validator.js";
const fields = {
  name: { type: "string", minLength: 2, maxLength: 120, trim: true },
  contactName: { type: "string", minLength: 2, maxLength: 100, trim: true },
  email: { type: "string", email: true, maxLength: 254, trim: true },
  phone: { type: "string", maxLength: 40 },
  facebookPageName: { type: "string", maxLength: 150 },
  facebookPageId: { type: "string", maxLength: 100 },
  adAccountId: { type: "string", maxLength: 100 },
  status: { type: "string", enum: ["active", "paused", "inactive"] },
  monthlyBudget: { type: "number", min: 0, max: 1_000_000_000 },
  billingRate: { type: "number", min: 1, max: 1_000_000 },
  color: { type: "string", maxLength: 100 },
  notes: { type: "string", maxLength: 2000 },
  assignedTeamMembers: { custom: value => Array.isArray(value) && value.length <= 100 && value.every(item => typeof item === "string" && isObjectId(item)) },
};
export const validateClientCreate = validateObject(Object.fromEntries(Object.entries(fields).map(([key, rule]) => [key, { ...rule, required: ["name", "contactName", "email"].includes(key) }])), "body", true);
export const validateClientUpdate = validateObject(fields, "body", true);
export const validateFacebookAccountAssignment = validateObject({
  facebookAdAccountId: { required: true, type: "string", custom: value => /^act_\d+$/.test(value) },
  assigned: { required: true, type: "boolean" },
}, "body", true);
