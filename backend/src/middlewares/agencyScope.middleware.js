import { ApiError } from "../utils/ApiError.js";

export const agencyScopeMiddleware = (req, _res, next) => {
  if (!req.user || String(req.user.agency) !== String(req.params.agencyId)) {
    return next(new ApiError(403, "You do not have access to this agency"));
  }
  next();
};
