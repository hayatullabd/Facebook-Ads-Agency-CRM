import { validateObject } from "./common.validator.js";

export const validateClientCreate = validateObject({
  name: { required: true, type: "string", minLength: 2, maxLength: 120 },
  contactName: { required: true, type: "string", minLength: 2, maxLength: 100 },
  email: { required: true, type: "string", email: true },
});
