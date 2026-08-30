import { ApiError } from "../utils/ApiError.js";

export const roleMiddleware = (...allowedRoles) => (req, _res, next) => {
  const effectiveRoles = allowedRoles.includes("admin") ? [...allowedRoles, "owner"] : allowedRoles;
  if (!req.user || !effectiveRoles.includes(req.user.role)) {
    return next(new ApiError(403, "Forbidden"));
  }

  next();
};
