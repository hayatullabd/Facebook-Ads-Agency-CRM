import crypto from "crypto";

export const generateId = (prefix) => {
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${suffix}`;
};
