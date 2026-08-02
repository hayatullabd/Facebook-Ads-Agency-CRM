import { Router } from "express";
import { createCampaign, getCampaigns, updateCampaign } from "../controllers/campaign.controller.js";
import { agencyScopeMiddleware } from "../middlewares/agencyScope.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";

const router = Router({ mergeParams: true });

router.use("/:agencyId", agencyScopeMiddleware);
router.get("/:agencyId", getCampaigns);
router.post("/:agencyId", roleMiddleware("admin", "team"), createCampaign);
router.patch("/:agencyId/:campaignId", roleMiddleware("admin", "team"), updateCampaign);

export default router;
