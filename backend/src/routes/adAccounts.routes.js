import { Router } from "express";
import { getAdAccountDetail, getAdAccounts, previewAdAccountSpendCap, updateAdAccountSpendCap } from "../controllers/adAccounts.controller.js";
import { agencyScopeMiddleware } from "../middlewares/agencyScope.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";

const router = Router({ mergeParams: true });
router.use("/:agencyId", agencyScopeMiddleware, roleMiddleware("admin", "team"));
router.post("/:agencyId/:accountId/spend-cap/preview", roleMiddleware("admin"), previewAdAccountSpendCap);
router.put("/:agencyId/:accountId/spend-cap", roleMiddleware("admin"), updateAdAccountSpendCap);
router.get("/:agencyId/:accountId", getAdAccountDetail);
router.get("/:agencyId", getAdAccounts);

export default router;
