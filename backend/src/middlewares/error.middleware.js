import { env } from "../config/env.js";
export const errorMiddleware = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Internal Server Error";
  if (["ValidationError", "CastError"].includes(err.name)) { statusCode = 400; message = "Invalid request data"; }
  if (err.name === "VersionError") { statusCode = 409; message = "This record changed. Refresh and retry."; }
  if (err.code === 11000) { statusCode = 409; message = "A record with these unique values already exists"; }
  if (err.type === "entity.parse.failed") { statusCode = 400; message = "Invalid JSON request body"; }
  if (err.type === "entity.too.large") { statusCode = 413; message = "Request body is too large"; }
  if (!Number.isInteger(statusCode) || statusCode < 400 || statusCode > 599) statusCode = 500;
  const requestId = req.id || res.get("X-Request-ID") || "unknown";
  if (statusCode >= 500) {
    // Never log credential-bearing upstream messages, bodies or query strings.
    console.error(JSON.stringify({ requestId, method: req.method, path: req.path, statusCode, error: err.name || "Error" }));
    if (env.isProduction) message = statusCode === 503 ? "Service temporarily unavailable" : "Internal Server Error";
  }
  res.status(statusCode).json({ success: false, message, requestId });
};
