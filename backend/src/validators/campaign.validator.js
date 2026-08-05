import { isObjectId, validateObject } from "./common.validator.js";

const budgetRule = {
  type: "object",
  custom: (value) => {
    if (!value || Array.isArray(value)) return false;
    if (Object.keys(value).some((field) => !["amount", "type", "currency"].includes(field))) return false;
    return typeof value.amount === "number" && Number.isFinite(value.amount) && value.amount >= 0
      && ["daily", "lifetime"].includes(value.type)
      && typeof value.currency === "string" && value.currency.trim().length > 0;
  },
};

export const validateCampaignCreate = validateObject({
  client: { required: true, type: "string", custom: isObjectId },
  adRequest: { required: true, type: "string", custom: isObjectId },
  name: { required: true, type: "string", minLength: 1, maxLength: 180 },
  platform: { required: true, type: "string", enum: ["facebook", "instagram", "both"] },
  objective: { required: true, type: "string", minLength: 1 },
  budget: { ...budgetRule, required: true },
});
export const validateCampaignUpdate = validateObject({
  name: { type: "string", minLength: 1, maxLength: 180, trim: true },
  objective: { type: "string", minLength: 1, trim: true },
  budget: budgetRule,
  status: { type: "string", enum: ["draft", "scheduled", "active", "paused", "completed", "failed"] },
  client: { type: "string", custom: isObjectId },
  adRequest: { type: "string", custom: isObjectId },
}, "body", true);
export const validateFacebookCampaignQuery = validateObject({
  facebookAdAccountId: { type: "string", custom: (value) => /^act_\d+$/.test(value) },
}, "query");

export const validateCampaignClientAssignment = validateObject({
  clientId: { required: (req) => req.body.clientId !== null, custom: (value) => value === null || (typeof value === "string" && isObjectId(value)) },
});
