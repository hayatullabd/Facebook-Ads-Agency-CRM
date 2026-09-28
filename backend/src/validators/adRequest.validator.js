import mongoose from "mongoose";
import { REQUEST_STATUSES } from "../constants/requestStatuses.js";
import { ApiError } from "../utils/ApiError.js";

const PLATFORMS = ["facebook", "whatsapp", "instagram", "youtube", "google"];
const OBJECTIVE_GROUPS = ["message", "engagement", "website", "others", "page", "awareness", "leads"];
const BUDGET_TYPES = ["daily", "lifetime"];
const CURRENCIES = ["USD", "BDT", "INR"];
const CREATE_FIELDS = ["client", "pageName", "platform", "objectiveGroup", "objective", "budget", "durationDays", "notes", "contentLink"];
const UPDATE_FIELDS = new Set(CREATE_FIELDS);

const fail = (next, message) => next(new ApiError(400, message));
const validLink = (value) => {
  if (value === "") return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const validateString = (body, field, { required = false, min = 0, max, values } = {}) => {
  const value = body[field];
  if (required && (typeof value !== "string" || !value.trim())) return `${field} is required`;
  if (value === undefined) return null;
  if (typeof value !== "string") return `${field} must be a string`;
  if (value.length < min) return `${field} must be at least ${min} characters`;
  if (max && value.length > max) return `${field} must be at most ${max} characters`;
  if (values && !values.includes(value)) return `${field} must be one of: ${values.join(", ")}`;
  return null;
};

const validatePlatforms = (body, required) => {
  const value = body.platform;
  if (value === undefined && !required) return null;
  if (value === undefined) return "platform is required";
  const values = Array.isArray(value) ? value : value === "both" ? ["facebook", "instagram"] : [value];
  if (!values.length || values.some((platform) => typeof platform !== "string" || !PLATFORMS.includes(platform))) {
    return `platform must contain only: ${PLATFORMS.join(", ")}`;
  }
  body.platform = values;
  return null;
};

const validateObjectiveGroups = (body, required) => {
  const value = body.objectiveGroup;
  if (value === undefined && !required) return null;
  if (value === undefined) return "objectiveGroup is required";
  const values = Array.isArray(value) ? value : typeof value === "string" ? [value] : null;
  if (!values) return "objectiveGroup must be a list of groups";
  const cleaned = [...new Set(values)];
  if (!cleaned.length || cleaned.some((group) => typeof group !== "string" || !OBJECTIVE_GROUPS.includes(group))) {
    return `objectiveGroup must contain only: ${OBJECTIVE_GROUPS.join(", ")}`;
  }
  body.objectiveGroup = cleaned;
  return null;
};

const validateObjectives = (body, required) => {
  const value = body.objective;
  if (value === undefined && !required) return null;
  if (value === undefined) return "objective is required";
  const values = Array.isArray(value) ? value : typeof value === "string" ? [value] : null;
  if (!values) return "objective must be a list of objectives";
  const cleaned = [...new Set(values.map((item) => typeof item === "string" ? item.trim() : "").filter(Boolean))];
  if (!cleaned.length) return "At least one objective is required";
  if (cleaned.length > 12) return "At most 12 objectives are allowed";
  if (cleaned.some((item) => item.length < 2 || item.length > 100)) return "Each objective must be 2 to 100 characters";
  body.objective = cleaned;
  return null;
};

const validateBudget = (budget, required) => {
  if (budget === undefined && !required) return null;
  if (!budget || typeof budget !== "object" || Array.isArray(budget)) return "budget must be an object";
  if (Object.keys(budget).some((key) => !["amount", "type", "currency"].includes(key))) return "budget contains unsupported fields";
  if (typeof budget.amount !== "number" || !Number.isFinite(budget.amount) || budget.amount < 1) return "budget.amount must be a number of at least 1";
  if (!BUDGET_TYPES.includes(budget.type)) return `budget.type must be one of: ${BUDGET_TYPES.join(", ")}`;
  if (!CURRENCIES.includes(budget.currency)) return `budget.currency must be one of: ${CURRENCIES.join(", ")}`;
  return null;
};

const validateBrief = (req, next, create) => {
  const body = req.body || {};
  const allowed = create ? new Set(CREATE_FIELDS) : UPDATE_FIELDS;
  if (Object.keys(body).some((field) => !allowed.has(field))) return fail(next, "Request contains unsupported or immutable fields");
  if (!create && Object.keys(body).length === 0) return fail(next, "At least one editable field is required");
  if ((create && !["client", "moderator"].includes(req.user?.role)) || body.client !== undefined) {
    if (!mongoose.isValidObjectId(body.client)) return fail(next, "client is invalid");
  }
  const errors = [
    validateString(body, "pageName", { required: create, min: 2, max: 150 }),
    validatePlatforms(body, create),
    validateObjectiveGroups(body, create),
    validateObjectives(body, create),
    validateString(body, "notes", { max: 2000 }),
    validateString(body, "contentLink", { max: 2048 }),
    validateBudget(body.budget, create),
  ].filter(Boolean);
  if (body.durationDays !== undefined && (typeof body.durationDays !== "number" || !Number.isInteger(body.durationDays) || body.durationDays < 1 || body.durationDays > 365)) {
    errors.push("durationDays must be an integer from 1 to 365");
  } else if (create && body.durationDays === undefined) errors.push("durationDays is required");
  if (body.contentLink !== undefined && !validLink(body.contentLink)) errors.push("contentLink must be an absolute HTTP or HTTPS URL");
  return errors.length ? fail(next, errors[0]) : next();
};

export const validateAdRequestCreate = (req, _res, next) => validateBrief(req, next, true);
export const validateAdRequestUpdate = (req, _res, next) => validateBrief(req, next, false);

export const validateAdRequestStatus = (req, _res, next) => {
  const body = req.body || {};
  if (Object.keys(body).some((field) => !["status", "agencyNote", "rejectionReason"].includes(field))) return fail(next, "Status update contains unsupported fields");
  if (!REQUEST_STATUSES.includes(body.status)) return fail(next, `status must be one of: ${REQUEST_STATUSES.join(", ")}`);
  const agencyNoteError = validateString(body, "agencyNote", { max: 1000 });
  const rejectionError = validateString(body, "rejectionReason", { required: body.status === "Rejected", max: 1000 });
  if (agencyNoteError || rejectionError) return fail(next, agencyNoteError || rejectionError);
  next();
};
