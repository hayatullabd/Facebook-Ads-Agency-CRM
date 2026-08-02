import { env } from "../config/env.js";

export const errorMiddleware = (err, req, res, _next) => {
  const statusCode = Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const requestId = req.id || res.get("X-Request-ID") || "unknown";

  if (statusCode >= 500) {
    console.error(`[${requestId}] ${req.method} ${req.originalUrl || req.path}`, err.stack || err.message || err);
  }

  const message = statusCode >= 500 && env.isProduction
    ? "Internal Server Error"
    : (err.message || "Internal Server Error");

  res.status(statusCode).json({
    success: false,
    message,
    requestId,
  });
};
