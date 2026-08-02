import { Router } from "express";
import { createCampaign, getCampaigns, updateCampaign } from "../controllers/campaign.controller.js";
import { agencyScopeMiddleware } from "../middlewares/agencyScope.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { validateCampaignCreate, validateCampaignUpdate } from "../validators/campaign.validator.js";
import { validateObjectIdParam } from "../validators/common.validator.js";

const router = Router({ mergeParams: true });
router.param("campaignId", validateObjectIdParam);

router.use("/:agencyId", agencyScopeMiddleware);
router.get("/:agencyId", getCampaigns);
router.post("/:agencyId", roleMiddleware("admin", "team"), validateCampaignCreate, createCampaign);
router.patch("/:agencyId/:campaignId", roleMiddleware("admin", "team"), validateCampaignUpdate, updateCampaign);

export default router;
