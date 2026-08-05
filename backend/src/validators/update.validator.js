import { isObjectId, validateObject } from "./common.validator.js";

const updateRules = {
  client: { required: true, type: "string", custom: isObjectId },
  adRequest: { required: true, type: "string", custom: isObjectId },
  title: { required: true, type: "string", minLength: 1, maxLength: 150, trim: true },
  content: { required: true, type: "string", minLength: 1, maxLength: 3000, trim: true },
  type: { type: "string", enum: ["message", "performance", "billing", "status"] },
};

export const validateUpdateCreate = validateObject(updateRules);
export const validateUpdateEdit = validateObject({
  client: { type: "string", custom: isObjectId },
  adRequest: { type: "string", custom: isObjectId },
  title: { type: "string", minLength: 1, maxLength: 150, trim: true },
  content: { type: "string", minLength: 1, maxLength: 3000, trim: true },
  type: updateRules.type,
}, "body", true);
