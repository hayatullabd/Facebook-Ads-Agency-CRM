import { validateObject } from "./common.validator.js";

export const validateLogin = validateObject({
  email: { required: true, type: "string", email: true },
  password: { required: true, type: "string", minLength: 1 },
});
export const validateRegistration = validateObject({
  agencyName: { required: true, type: "string", minLength: 2, maxLength: 120 },
  name: { required: true, type: "string", minLength: 2, maxLength: 100 },
  email: { required: true, type: "string", email: true },
  password: { required: true, type: "string", minLength: 12 },
});
