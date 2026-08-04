import { ROLES } from "../constants/roles.js";
import { validateObject } from "./common.validator.js";

export const validateUserCreate = validateObject({
  name: { required: true, type: "string", minLength: 2, maxLength: 100 },
  email: { required: true, type: "string", email: true },
  password: { required: true, type: "string", minLength: 12 },
  role: { required: true, type: "string", enum: Object.values(ROLES) },
  client: { type: "string" },
});
