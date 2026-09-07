import { createRateLimiter } from "../services/rateLimit.service.js";
export const apiRateLimiter = createRateLimiter("api", 1000);
