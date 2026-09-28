import { ROLES } from "../constants/roles.js";
import { TEAM_ASSIGNABLE_FEATURES } from "../utils/accessControl.js";
import { isObjectId, validateObject } from "./common.validator.js";

const featureList = (value) => value == null || (Array.isArray(value) && value.length <= TEAM_ASSIGNABLE_FEATURES.length && value.every((item) => TEAM_ASSIGNABLE_FEATURES.includes(item)));

export const validateUserCreate = validateObject({
  name: { required: true, type: "string", minLength: 2, maxLength: 100 },
  email: { required: true, type: "string", email: true },
  password: { required: true, type: "string", minLength: 12 },
  role: { required: true, type: "string", enum: Object.values(ROLES) },
  client: { custom: (value) => value === null || (typeof value === "string" && isObjectId(value)) },
  features: { custom: featureList },
});

export const validateUserUpdate = validateObject({
  name: { type: "string", minLength: 2, maxLength: 100, trim: true },
  email: { type: "string", email: true, trim: true },
  role: { type: "string", enum: Object.values(ROLES) },
  client: { custom: (value) => value === null || (typeof value === "string" && isObjectId(value)) },
  isActive: { type: "boolean" },
  features: { custom: featureList },
}, "body", true);
