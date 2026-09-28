import { validateObject } from "./common.validator.js";

export const validatePasswordChange = validateObject({
  currentPassword: { required: true, type: "string", minLength: 1, maxLength: 200 },
  newPassword: { required: true, type: "string", minLength: 12, maxLength: 200 },
}, "body", true);

export const validateLogin = validateObject({
  email: { required: true, type: "string", email: true, trim: true },
  password: { required: true, type: "string", minLength: 1 },
});
export const validateWorkspaceCreate = validateObject({
  agencyName: { required: true, type: "string", minLength: 2, maxLength: 120, trim: true },
  name: { required: true, type: "string", minLength: 2, maxLength: 100, trim: true },
  email: { required: true, type: "string", email: true, trim: true },
  password: { required: true, type: "string", minLength: 12 },
  plan: { required: true, type: "string", custom: (value) => /^[a-f\d]{24}$/i.test(value) },
}, "body", true);

export const validateRegistration = validateObject({
  agencyName: { required: true, type: "string", minLength: 2, maxLength: 120, trim: true },
  name: { required: true, type: "string", minLength: 2, maxLength: 100, trim: true },
  email: { required: true, type: "string", email: true, trim: true },
  password: { required: true, type: "string", minLength: 12 },
  mode: { type: "string", enum: ["create", "join"] },
}, "body", true);
