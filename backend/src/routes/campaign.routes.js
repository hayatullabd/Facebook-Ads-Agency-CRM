import { Router } from "express";
import { assignCampaignClient, createCampaign, deleteCampaign, getCampaigns, updateCampaign } from "../controllers/campaign.controller.js";
import { agencyScopeMiddleware } from "../middlewares/agencyScope.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { validateCampaignClientAssignment, validateCampaignCreate, validateCampaignUpdate } from "../validators/campaign.validator.js";
import { validateObjectIdParam } from "../validators/common.validator.js";
import { validateFacebookCampaignQuery } from "../validators/campaign.validator.js";

const router = Router({ mergeParams: true });
router.param("campaignId", validateObjectIdParam);

router.use("/:agencyId", agencyScopeMiddleware);
router.get("/:agencyId", validateFacebookCampaignQuery, getCampaigns);
router.post("/:agencyId", roleMiddleware("admin", "team"), validateCampaignCreate, createCampaign);
router.patch("/:agencyId/:campaignId/client-assignment", roleMiddleware("admin", "team"), validateCampaignClientAssignment, assignCampaignClient);
router.patch("/:agencyId/:campaignId", roleMiddleware("admin", "team"), validateCampaignUpdate, updateCampaign);
router.delete("/:agencyId/:campaignId", roleMiddleware("admin", "team"), deleteCampaign);

export default router;
