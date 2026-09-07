import { createRateLimiter } from "../services/rateLimit.service.js";
export const authRateLimiter = createRateLimiter("auth", 10);
