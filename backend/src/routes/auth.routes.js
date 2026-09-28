import { Router } from "express";
import { login, register } from "../controllers/auth.controller.js";
import { authRateLimiter } from "../middlewares/authRateLimiter.middleware.js";
import { validateLogin } from "../validators/auth.validator.js";

const router = Router();

router.post("/login", authRateLimiter, validateLogin, login);
router.post("/register", authRateLimiter, register);

export default router;
