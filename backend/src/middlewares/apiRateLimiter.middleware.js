import { createHash } from "node:crypto";
import { env } from "../config/env.js";

const WINDOW_MS = 15 * 60 * 1000;
const AUTHED_MAX = env.isProduction ? 3000 : 20000;
const ANON_MAX = env.isProduction ? 120 : 5000;
const MAX_ENTRIES = 50_000;
const buckets = new Map();
let requestsSinceCleanup = 0;

function cleanup(now) {
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key);
  }
  while (buckets.size >= MAX_ENTRIES) {
    buckets.delete(buckets.keys().next().value);
  }
}

function bucketKey(req) {
  const header = req.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ") && header.length > 16 && header.length < 4096) {
    return `user:${createHash("sha256").update(header).digest("base64url").slice(0, 24)}`;
  }
  return `ip:${req.ip || "unknown"}`;
}

export const apiRateLimiter = (req, res, next) => {
  const now = Date.now();
  requestsSinceCleanup += 1;
  if (requestsSinceCleanup >= 200 || buckets.size >= MAX_ENTRIES) {
    cleanup(now);
    requestsSinceCleanup = 0;
  }

  const key = bucketKey(req);
  const limit = key.startsWith("user:") ? AUTHED_MAX : ANON_MAX;
  let entry = buckets.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, entry);
  }

  entry.count += 1;
  const remaining = Math.max(0, limit - entry.count);
  res.set("RateLimit-Limit", String(limit));
  res.set("RateLimit-Remaining", String(remaining));
  res.set("RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

  if (entry.count > limit) {
    res.set("Retry-After", String(Math.max(1, Math.ceil((entry.resetAt - now) / 1000))));
    return res.status(429).json({ success: false, message: "Too many requests. Please try again later." });
  }

  next();
};
