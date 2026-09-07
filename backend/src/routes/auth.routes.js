import { Router } from "express";
import { login, register, me, logout, changePassword } from "../controllers/auth.controller.js";
import { authRateLimiter } from "../middlewares/authRateLimiter.middleware.js";
import { validateLogin, validateRegistration } from "../validators/auth.validator.js";

import { authMiddleware } from "../middlewares/auth.middleware.js";
import { validateObject } from "../validators/common.validator.js";

const router = Router();

router.post("/login", authRateLimiter, validateLogin, login);
router.post("/register", authRateLimiter, validateRegistration, register);

router.get("/me", authMiddleware, me);
router.post("/logout", authMiddleware, logout);
router.post("/password", authMiddleware, authRateLimiter, validateObject({
  currentPassword: { required: true, type: "string", maxLength: 128 },
  newPassword: { required: true, type: "string", minLength: 12, maxLength: 72 },
}, "body", true), changePassword);

export default router;
