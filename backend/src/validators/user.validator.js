import { ROLES } from "../constants/roles.js";
import { isObjectId, validateObject } from "./common.validator.js";

export const validateUserCreate = validateObject({
  name: { required: true, type: "string", minLength: 2, maxLength: 100 },
  email: { required: true, type: "string", email: true },
  password: { required: true, type: "string", minLength: 12 },
  role: { required: true, type: "string", enum: Object.values(ROLES) },
  client: { custom: (value) => value === null || (typeof value === "string" && isObjectId(value)) },
});

export const validateUserUpdate = validateObject({
  name: { type: "string", minLength: 2, maxLength: 100, trim: true },
  email: { type: "string", email: true, trim: true },
  role: { type: "string", enum: Object.values(ROLES) },
  client: { custom: (value) => value === null || (typeof value === "string" && isObjectId(value)) },
  isActive: { type: "boolean" },
}, "body", true);
