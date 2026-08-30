import { PLATFORM_ROLES } from "../constants/roles.js";
import { ApiError } from "../utils/ApiError.js";

export const platformRoleMiddleware = (...allowedRoles) => (req, _res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.platformRole || PLATFORM_ROLES.USER)) {
    return next(new ApiError(403, "Forbidden"));
  }
  next();
};
