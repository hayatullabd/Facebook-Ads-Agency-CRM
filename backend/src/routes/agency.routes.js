import { Router } from "express";
import {
  getAgency,
  getFacebookOverview,
  saveFacebookCredential,
  syncFacebookOverview,
  updateAgency,
} from "../controllers/agency.controller.js";
import { agencyScopeMiddleware } from "../middlewares/agencyScope.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";

const router = Router({ mergeParams: true });

router.use("/:agencyId", agencyScopeMiddleware);
router.get("/:agencyId", roleMiddleware("admin"), getAgency);
router.get("/:agencyId/facebook-overview", getFacebookOverview);
router.post("/:agencyId/facebook-sync", roleMiddleware("admin"), syncFacebookOverview);
router.patch("/:agencyId", roleMiddleware("admin"), updateAgency);
router.post("/:agencyId/facebook", roleMiddleware("admin"), saveFacebookCredential);

export default router;
