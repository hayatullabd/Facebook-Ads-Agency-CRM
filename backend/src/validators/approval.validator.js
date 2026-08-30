import { ROLES } from "../constants/roles.js";
import { isObjectId, validateObject } from "./common.validator.js";

export const validateDecision = validateObject({
  decision: { required: true, type: "string", enum: ["approve", "reject"] },
}, "body", true);

const userDecisionFields = {
  role: { type: "string", enum: [ROLES.TEAM, ROLES.CLIENT, ROLES.MODERATOR] },
  client: { custom: (value) => value === null || (typeof value === "string" && isObjectId(value)) },
};

export const validateUserDecision = validateObject({
  decision: { required: true, type: "string", enum: ["approve", "reject"] },
  ...userDecisionFields,
}, "body", true);

export const validateUserApproval = validateObject(userDecisionFields, "body", false);
export const validateEmptyDecision = validateObject({}, "body", false);
