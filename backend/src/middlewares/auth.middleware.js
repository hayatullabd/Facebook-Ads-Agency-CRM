import jwt from "jsonwebtoken";
import User from "../models/User.model.js";
import Agency from "../models/Agency.model.js";
import { PLATFORM_ROLES, USER_STATUSES, WORKSPACE_STATUSES } from "../constants/roles.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const SESSION_CACHE_MS = 30_000;
const SESSION_CACHE_MAX = 25_000;
const sessionCache = new Map();
const userFields = "agency client name email role platformRole status isActive features featuresConfigured";

function readSession(userId) {
  const hit = sessionCache.get(userId);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    sessionCache.delete(userId);
    return null;
  }
  return hit.user;
}

function storeSession(userId, user) {
  if (sessionCache.size >= SESSION_CACHE_MAX) {
    sessionCache.delete(sessionCache.keys().next().value);
  }
  sessionCache.set(userId, { user, expiresAt: Date.now() + SESSION_CACHE_MS });
}

export const authMiddleware = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.split(" ")[1] : null;

  if (!token) {
    throw new ApiError(401, "Unauthorized");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, env.jwtSecret);
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError(401, "Session expired");
    }
    throw new ApiError(401, "Unauthorized");
  }

  const cached = readSession(decoded.id);
  if (cached) {
    req.user = cached;
    return next();
  }

  const user = await User.findById(decoded.id).select(userFields).lean();

  if (!user || !user.isActive || (user.status && user.status !== USER_STATUSES.ACTIVE)) {
    throw new ApiError(401, "Unauthorized");
  }

  if ((user.platformRole || PLATFORM_ROLES.USER) !== PLATFORM_ROLES.ADMIN) {
    const agency = await Agency.findById(user.agency).select("status").lean();
    if (!agency || (agency.status && agency.status !== WORKSPACE_STATUSES.ACTIVE)) {
      throw new ApiError(403, "Workspace is not active");
    }
  }

  storeSession(decoded.id, user);
  req.user = user;
  next();
});
