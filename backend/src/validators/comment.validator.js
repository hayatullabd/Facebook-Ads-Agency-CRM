import { validateObject } from "./common.validator.js";

export const validateCommentCreate = validateObject({
  content: { type: "string", required: true, trim: true, maxLength: 2000 },
}, "body", true);

export const validateCommentUpdate = validateObject({
  content: { type: "string", required: true, trim: true, maxLength: 2000 },
}, "body", true);
