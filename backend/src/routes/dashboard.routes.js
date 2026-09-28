import { Router } from "express";
import { getDashboardSummary, getPlatformDashboard } from "../controllers/dashboard.controller.js";
import { PLATFORM_ROLES } from "../constants/roles.js";
import { agencyScopeMiddleware } from "../middlewares/agencyScope.middleware.js";
import { platformRoleMiddleware } from "../middlewares/platformRole.middleware.js";

const router = Router({ mergeParams: true });

router.get("/platform", platformRoleMiddleware(PLATFORM_ROLES.ADMIN), getPlatformDashboard);
router.get("/:agencyId", agencyScopeMiddleware, getDashboardSummary);

export default router;
