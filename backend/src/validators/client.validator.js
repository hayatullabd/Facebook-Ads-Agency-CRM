import { validateObject } from "./common.validator.js";

const canonicalFacebookAdAccount = (value) => /^act_\d+$/.test(value);

export const validateClientCreate = validateObject({
  name: { required: true, type: "string", minLength: 2, maxLength: 120 },
  contactName: { required: true, type: "string", minLength: 2, maxLength: 100 },
  email: { required: true, type: "string", email: true },
});

export const validateFacebookAccountAssignment = validateObject({
  facebookAdAccountId: { required: true, type: "string", custom: canonicalFacebookAdAccount },
  assigned: { required: true, type: "boolean" },
});
