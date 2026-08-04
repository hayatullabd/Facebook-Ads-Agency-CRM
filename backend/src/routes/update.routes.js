import { Router } from "express";
import { createUpdate, getUpdates, markUpdateRead } from "../controllers/update.controller.js";
import { agencyScopeMiddleware } from "../middlewares/agencyScope.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { validateUpdateCreate } from "../validators/update.validator.js";
import { validateObjectIdParam } from "../validators/common.validator.js";

const router = Router({ mergeParams: true });
router.param("updateId", validateObjectIdParam);

router.use("/:agencyId", agencyScopeMiddleware);
router.get("/:agencyId", getUpdates);
router.post("/:agencyId", roleMiddleware("admin", "team"), validateUpdateCreate, createUpdate);
router.patch("/:agencyId/:updateId/read", markUpdateRead);

export default router;
