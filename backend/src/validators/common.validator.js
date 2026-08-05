import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";

export const isEmail = (value) => /^\S+@\S+\.\S+$/.test(value);
export const isObjectId = (value) => mongoose.isValidObjectId(value);
export const objectIdRule = { type: "string", custom: (value) => isObjectId(value) };
export const agencyParams = { agencyId: objectIdRule };
export const idParams = (name) => ({ [name]: objectIdRule });

export const validateObject = (rules, source = "body") => (req, _res, next) => {
  const values = req[source] || {};
  for (const [field, rule] of Object.entries(rules)) {
    const value = values[field];
    const required = typeof rule.required === "function" ? rule.required(req) : rule.required;
    if (required && (value === undefined || value === null || value === "")) {
      return next(new ApiError(400, `${field} is required`));
    }
    if (value !== undefined && value !== null && rule.type && typeof value !== rule.type) {
      return next(new ApiError(400, `${field} must be a ${rule.type}`));
    }
    if (typeof value === "string") {
      const normalizedValue = rule.trim ? value.trim() : value;
      if (rule.trim) values[field] = normalizedValue;
      if (required && !normalizedValue) return next(new ApiError(400, `${field} is required`));
      if (rule.minLength && normalizedValue.length < rule.minLength) return next(new ApiError(400, `${field} must be at least ${rule.minLength} characters`));
      if (rule.maxLength && normalizedValue.length > rule.maxLength) return next(new ApiError(400, `${field} must be at most ${rule.maxLength} characters`));
    }
    if (typeof value === "number") {
      if (rule.min !== undefined && value < rule.min) return next(new ApiError(400, `${field} must be at least ${rule.min}`));
      if (rule.max !== undefined && value > rule.max) return next(new ApiError(400, `${field} must be at most ${rule.max}`));
    }
    if (value !== undefined && value !== null && rule.enum && !rule.enum.includes(value)) return next(new ApiError(400, `${field} must be one of: ${rule.enum.join(", ")}`));
    if (value !== undefined && value !== null && rule.email && !isEmail(values[field])) return next(new ApiError(400, `${field} must be a valid email`));
    if (value !== undefined && value !== null && rule.custom && !rule.custom(values[field], req)) return next(new ApiError(400, `${field} is invalid`));
  }
  next();
};

export const validateParams = (rules) => validateObject(rules, "params");
export const validateObjectIdParam = (req, _res, next, value, name) => {
  if (!isObjectId(value)) return next(new ApiError(400, `${name} is invalid`));
  next();
};
