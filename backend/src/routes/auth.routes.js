import { Router } from "express";
import { login, register } from "../controllers/auth.controller.js";
import { authRateLimiter } from "../middlewares/authRateLimiter.middleware.js";
import { validateFields } from "../middlewares/validate.middleware.js";

const router = Router();

router.post(
  "/login",
  authRateLimiter,
  validateFields({ email: { required: true, type: "string" }, password: { required: true, type: "string", minLength: 1 } }),
  login
);
router.post(
  "/register",
  authRateLimiter,
  validateFields({ agencyName: { required: true, type: "string", minLength: 2 }, name: { required: true, type: "string", minLength: 2 }, email: { required: true, type: "string" }, password: { required: true, type: "string", minLength: 12 } }),
  register
);

export default router;
