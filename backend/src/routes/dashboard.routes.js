import { Router } from "express";
import { getDashboardSummary } from "../controllers/dashboard.controller.js";
import { agencyScopeMiddleware } from "../middlewares/agencyScope.middleware.js";

const router = Router({ mergeParams: true });

router.get("/:agencyId", agencyScopeMiddleware, getDashboardSummary);

export default router;
