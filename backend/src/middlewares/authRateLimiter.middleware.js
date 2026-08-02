const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_ENTRIES = 10_000;
const attempts = new Map();
let requestsSinceCleanup = 0;

const cleanupExpiredEntries = (now) => {
  for (const [key, entry] of attempts) {
    if (entry.resetAt <= now) attempts.delete(key);
  }

  while (attempts.size >= MAX_ENTRIES) {
    attempts.delete(attempts.keys().next().value);
  }
};

export const authRateLimiter = (req, res, next) => {
  const now = Date.now();
  requestsSinceCleanup += 1;
  if (requestsSinceCleanup >= 100 || attempts.size >= MAX_ENTRIES) {
    cleanupExpiredEntries(now);
    requestsSinceCleanup = 0;
  }

  const normalizedEmail = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase().slice(0, 254) : "anonymous";
  const key = `${req.ip}:${req.baseUrl}${req.path}:${normalizedEmail}`;
  let entry = attempts.get(key);

  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    attempts.set(key, entry);
  }

  const remaining = Math.max(0, MAX_ATTEMPTS - entry.count);
  res.set("RateLimit-Limit", String(MAX_ATTEMPTS));
  res.set("RateLimit-Remaining", String(remaining));
  res.set("RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

  if (entry.count >= MAX_ATTEMPTS) {
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    res.set("Retry-After", String(retryAfter));
    return res.status(429).json({ success: false, message: "Too many authentication attempts. Please try again later." });
  }

  entry.count += 1;
  res.set("RateLimit-Remaining", String(Math.max(0, MAX_ATTEMPTS - entry.count)));
  next();
};
