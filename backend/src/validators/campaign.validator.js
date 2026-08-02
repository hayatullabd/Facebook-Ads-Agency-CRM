import { validateObject } from "./common.validator.js";

export const validateCampaignCreate = validateObject({
  client: { required: true, type: "string" },
  adRequest: { required: true, type: "string" },
  name: { required: true, type: "string", minLength: 1, maxLength: 180 },
  platform: { required: true, type: "string", enum: ["facebook", "instagram", "both"] },
  objective: { required: true, type: "string", minLength: 1 },
});
export const validateCampaignUpdate = validateObject({ status: { type: "string", enum: ["draft", "scheduled", "active", "paused", "completed", "failed"] } });
export const validateFacebookCampaignQuery = validateObject({
  facebookAdAccountId: { type: "string", custom: (value) => /^act_\d+$/.test(value) },
}, "query");
