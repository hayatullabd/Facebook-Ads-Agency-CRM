import { validateObject } from "./common.validator.js";

export const validateLogin = validateObject({
  email: { required: true, type: "string", email: true, trim: true, maxLength: 254 },
  password: { required: true, type: "string", minLength: 1, maxLength: 128 },
});
export const validateRegistration = validateObject({
  agencyName: { required: true, type: "string", minLength: 2, maxLength: 120, trim: true },
  name: { required: true, type: "string", minLength: 2, maxLength: 100, trim: true },
  email: { required: true, type: "string", email: true, trim: true, maxLength: 254 },
  password: { required: true, type: "string", minLength: 12, maxLength: 72 },
  mode: { type: "string", enum: ["create", "join"] },
}, "body", true);
