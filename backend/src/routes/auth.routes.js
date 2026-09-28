import { Router } from "express";
import { changePassword, login, register } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authRateLimiter } from "../middlewares/authRateLimiter.middleware.js";
import { validateLogin, validatePasswordChange } from "../validators/auth.validator.js";

const router = Router();

router.post("/login", authRateLimiter, validateLogin, login);
router.post("/register", authRateLimiter, register);
router.post("/password", authMiddleware, validatePasswordChange, changePassword);

export default router;
