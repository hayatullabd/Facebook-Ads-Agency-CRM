import { isObjectId, validateObject } from "./common.validator.js";
import { ApiError } from "../utils/ApiError.js";

const STRICT_DATE = /^\d{4}-\d{2}-\d{2}$/;
const parseUtcDate = (value) => {
  if (typeof value !== "string" || !STRICT_DATE.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
};

export const validateFacebookCampaignQuery = validateObject({
  facebookAdAccountId: { type: "string", custom: (value) => /^act_\d+$/.test(value) },
}, "query");

export const validateCampaignInsightsQuery = (req, _res, next) => {
  const fields = Object.keys(req.query || {});
  const unknownField = fields.find((field) => !["since", "until"].includes(field));
  if (unknownField) return next(new ApiError(400, `${unknownField} is not allowed`));

  const since = parseUtcDate(req.query.since);
  const until = parseUtcDate(req.query.until);
  if (!since) return next(new ApiError(400, "since must be a valid date in YYYY-MM-DD format"));
  if (!until) return next(new ApiError(400, "until must be a valid date in YYYY-MM-DD format"));
  if (since > until) return next(new ApiError(400, "since must be on or before until"));

  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);
  if (until > todayUtc) return next(new ApiError(400, "until cannot be in the future"));
  const rangeDays = Math.floor((until - since) / 86400000) + 1;
  if (rangeDays > 93) return next(new ApiError(400, "Date range cannot exceed 93 days"));
  next();
};

export const validateCampaignClientAssignment = validateObject({
  clientId: { required: (req) => req.body.clientId !== null, custom: (value) => value === null || (typeof value === "string" && isObjectId(value)) },
});

export const validateCampaignRequestAssignment = validateObject({
  adRequestId: { required: (req) => req.body.adRequestId !== null, custom: (value) => value === null || (typeof value === "string" && isObjectId(value)) },
});
