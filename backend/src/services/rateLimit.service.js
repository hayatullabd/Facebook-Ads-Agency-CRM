import { createHash } from "node:crypto";
import { env } from "../config/env.js";
import RateLimit from "../models/RateLimit.model.js";
import { ApiError } from "../utils/ApiError.js";
const entries = new Map();
export function createRateLimiter(namespace, maximum, windowMs = 15 * 60 * 1000) {
  return async (req, res, next) => {
    const now = Date.now();
    const bucket = Math.floor(now / windowMs);
    const resetAt = (bucket + 1) * windowMs;
    const key = createHash("sha256").update(`${namespace}:${req.ip}:${bucket}`).digest("hex");
    try {
      let count;
      if (env.rateLimitStore === "mongo") {
        const update = () => RateLimit.findOneAndUpdate({ _id: key }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(resetAt) } }, { upsert: true, new: true });
        let entry;
        try { entry = await update(); } catch (error) { if (error.code !== 11000) throw error; entry = await update(); }
        count = entry.count;
      } else {
        if (entries.size >= 20000) for (const [id, entry] of entries) if (entry.resetAt <= now) entries.delete(id);
        if (!entries.has(key) && entries.size >= 20000) throw new ApiError(503, "Rate limit capacity reached");
        const entry = entries.get(key) || { count: 0, resetAt };
        count = ++entry.count; entries.set(key, entry);
      }
      res.set({ "RateLimit-Limit": String(maximum), "RateLimit-Remaining": String(Math.max(0, maximum - count)), "RateLimit-Reset": String(Math.ceil(resetAt / 1000)) });
      if (count > maximum) {
        res.set("Retry-After", String(Math.max(1, Math.ceil((resetAt - now) / 1000))));
        return res.status(429).json({ success: false, message: "Too many requests. Please try again later." });
      }
      next();
    } catch { next(new ApiError(503, "Rate limiting is temporarily unavailable")); }
  };
}
