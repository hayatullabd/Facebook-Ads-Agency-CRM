import { Router } from "express";
import {
  createAdRequest,
  deleteAdRequest,
  getAdRequestActivity,
  getAdRequestDetails,
  getAdRequests,
  updateAdRequest,
  updateAdRequestStatus,
} from "../controllers/adRequest.controller.js";
import { agencyScopeMiddleware } from "../middlewares/agencyScope.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { validateAdRequestCreate, validateAdRequestStatus, validateAdRequestUpdate } from "../validators/adRequest.validator.js";
import { validateObjectIdParam } from "../validators/common.validator.js";

const router = Router({ mergeParams: true });
router.param("requestId", validateObjectIdParam);
router.use("/:agencyId", agencyScopeMiddleware);
router.get("/:agencyId", getAdRequests);
router.post("/:agencyId", validateAdRequestCreate, createAdRequest);
router.get("/:agencyId/:requestId/activity", getAdRequestActivity);
router.get("/:agencyId/:requestId", getAdRequestDetails);
router.patch("/:agencyId/:requestId", validateAdRequestUpdate, updateAdRequest);
router.delete("/:agencyId/:requestId", deleteAdRequest);
router.patch("/:agencyId/:requestId/status", roleMiddleware("admin", "team"), validateAdRequestStatus, updateAdRequestStatus);
export default router;
