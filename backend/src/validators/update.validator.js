import { validateObject } from "./common.validator.js";

export const validateUpdateCreate = validateObject({
  client: { required: true, type: "string" },
  adRequest: { required: true, type: "string" },
  title: { required: true, type: "string", minLength: 1, maxLength: 150 },
  content: { required: true, type: "string", minLength: 1, maxLength: 3000 },
  type: { type: "string", enum: ["message", "performance", "billing", "status"] },
});
