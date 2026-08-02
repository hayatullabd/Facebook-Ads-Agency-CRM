import { Router } from "express";
import { disconnectFacebook, getAgency, getFacebookAccounts, getFacebookOverview, saveFacebookCredential, syncFacebookOverview, updateAgency } from "../controllers/agency.controller.js";
import { agencyScopeMiddleware } from "../middlewares/agencyScope.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { validateAgencyUpdate, validateFacebookCredential, validateFacebookDisconnect } from "../validators/agency.validator.js";

const router = Router({ mergeParams: true });
router.use("/:agencyId", agencyScopeMiddleware);
router.get("/:agencyId", roleMiddleware("admin"), getAgency);
router.get("/:agencyId/facebook-overview", getFacebookOverview);
router.get("/:agencyId/facebook-accounts", getFacebookAccounts);
router.post("/:agencyId/facebook-sync", roleMiddleware("admin"), syncFacebookOverview);
router.patch("/:agencyId", roleMiddleware("admin"), validateAgencyUpdate, updateAgency);
router.post("/:agencyId/facebook", roleMiddleware("admin"), validateFacebookCredential, saveFacebookCredential);
router.delete("/:agencyId/facebook", roleMiddleware("admin"), validateFacebookDisconnect, disconnectFacebook);
export default router;
