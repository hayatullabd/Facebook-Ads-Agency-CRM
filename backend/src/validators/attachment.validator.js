import { validateObject } from "./common.validator.js";

const isHttpUrl = (value) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

export const validateAttachmentCreate = validateObject({
  name: { type: "string", required: true, trim: true, minLength: 1, maxLength: 255 },
  url: { type: "string", required: true, trim: true, maxLength: 2048, custom: isHttpUrl },
  mimeType: { type: "string", trim: true, maxLength: 100 },
  size: { type: "number", min: 0 },
}, "body", true);
