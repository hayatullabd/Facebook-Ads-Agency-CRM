const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 300;
const MAX_ENTRIES = 20_000;
const requests = new Map();
let requestsSinceCleanup = 0;

function cleanup(now) {
  for (const [key, entry] of requests) {
    if (entry.resetAt <= now) requests.delete(key);
  }

  while (requests.size >= MAX_ENTRIES) {
    requests.delete(requests.keys().next().value);
  }
}

export const apiRateLimiter = (req, res, next) => {
  const now = Date.now();
  requestsSinceCleanup += 1;
  if (requestsSinceCleanup >= 100 || requests.size >= MAX_ENTRIES) {
    cleanup(now);
    requestsSinceCleanup = 0;
  }

  let entry = requests.get(req.ip);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    requests.set(req.ip, entry);
  }

  entry.count += 1;
  const remaining = Math.max(0, MAX_REQUESTS - entry.count);
  res.set("RateLimit-Limit", String(MAX_REQUESTS));
  res.set("RateLimit-Remaining", String(remaining));
  res.set("RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

  if (entry.count > MAX_REQUESTS) {
    res.set("Retry-After", String(Math.max(1, Math.ceil((entry.resetAt - now) / 1000))));
    return res.status(429).json({ success: false, message: "Too many requests. Please try again later." });
  }

  next();
};
