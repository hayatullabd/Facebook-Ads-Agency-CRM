import { ApiError } from "../utils/ApiError.js";
import { resolveUserFeatures } from "../utils/accessControl.js";

const rules = [
  { feature: "clients", test: (path) => path.startsWith("/clients") },
  { feature: "requests", test: (path) => path.startsWith("/requests") || path.startsWith("/comments") || path.startsWith("/attachments") },
  { feature: "campaigns", test: (path) => path.startsWith("/campaigns") },
  { feature: "billing", test: (path) => path.startsWith("/invoices") },
  { feature: "payment_details", test: (path) => path.startsWith("/payments") },
  { feature: "subscriptions", test: (path) => path.startsWith("/subscriptions") },
  { feature: "adaccounts", test: (path) => path.includes("/facebook-accounts") },
];

export const featureAccessMiddleware = (req, _res, next) => {
  if (req.user?.role !== "team" || !req.user.featuresConfigured) return next();
  const rule = rules.find((item) => item.test(req.path));
  if (!rule) return next();
  if (resolveUserFeatures(req.user).includes(rule.feature)) return next();
  return next(new ApiError(403, "You do not have access to this feature"));
};
