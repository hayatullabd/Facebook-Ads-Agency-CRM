import { env } from "../config/env.js";

export const securityHeaders = (_req, res, next) => {
  res.set({
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  });

  if (env.isProduction) {
    res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  next();
};
