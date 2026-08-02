import { validateObject } from "./common.validator.js";
import { REQUEST_STATUSES } from "../constants/requestStatuses.js";

const isSafeContentLink = (value) => {
  if (value === "") return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export const validateAdRequestCreate = validateObject({
  client: { required: (req) => !["client", "moderator"].includes(req.user?.role), type: "string" },
  pageName: { required: true, type: "string", minLength: 2, maxLength: 150 },
  platform: { type: "string", enum: ["facebook", "instagram", "both"] },
  objectiveGroup: { required: true, type: "string", enum: ["website", "engagement", "page", "awareness", "leads"] },
  objective: { required: true, type: "string", minLength: 2, maxLength: 100 },
  durationDays: { required: true, type: "number", min: 1, max: 365 },
  contentLink: { type: "string", maxLength: 2048, custom: isSafeContentLink },
});
export const validateAdRequestStatus = validateObject({
  status: { required: true, type: "string", enum: REQUEST_STATUSES },
  agencyNote: { type: "string", maxLength: 1000 },
  rejectionReason: { type: "string", maxLength: 1000 },
});
