import { ApiError } from "../utils/ApiError.js";

export const validateFields = (rules) => (req, _res, next) => {
  for (const [field, rule] of Object.entries(rules)) {
    const value = req.body[field];

    if (rule.required && (value === undefined || value === null || value === "")) {
      return next(new ApiError(400, `${field} is required`));
    }

    if (value !== undefined && value !== null && rule.type && typeof value !== rule.type) {
      return next(new ApiError(400, `${field} must be a ${rule.type}`));
    }

    if (typeof value === "string") {
      if (rule.minLength && value.length < rule.minLength) {
        return next(new ApiError(400, `${field} must be at least ${rule.minLength} characters`));
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        return next(new ApiError(400, `${field} must be at most ${rule.maxLength} characters`));
      }
    }

    if (typeof value === "number") {
      if (rule.min !== undefined && value < rule.min) {
        return next(new ApiError(400, `${field} must be at least ${rule.min}`));
      }
      if (rule.max !== undefined && value > rule.max) {
        return next(new ApiError(400, `${field} must be at most ${rule.max}`));
      }
    }
  }

  next();
};
