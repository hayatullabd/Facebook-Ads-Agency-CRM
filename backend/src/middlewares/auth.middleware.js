import jwt from "jsonwebtoken";
import User from "../models/User.model.js";
import Agency from "../models/Agency.model.js";
import { PLATFORM_ROLES, USER_STATUSES, WORKSPACE_STATUSES } from "../constants/roles.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

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

  const user = await User.findById(decoded.id);

  if (!user || !user.isActive || (user.status && user.status !== USER_STATUSES.ACTIVE)) {
    throw new ApiError(401, "Unauthorized");
  }

  if ((user.platformRole || PLATFORM_ROLES.USER) !== PLATFORM_ROLES.ADMIN) {
    const agency = await Agency.findById(user.agency).select("status");
    if (!agency || (agency.status && agency.status !== WORKSPACE_STATUSES.ACTIVE)) {
      throw new ApiError(403, "Workspace is not active");
    }
  }

  req.user = user;
  next();
});
