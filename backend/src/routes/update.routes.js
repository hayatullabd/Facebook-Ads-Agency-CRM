import { Router } from "express";
import { createUpdate, deleteUpdate, getUpdates, markUpdateRead, updateClientUpdate } from "../controllers/update.controller.js";
import { agencyScopeMiddleware } from "../middlewares/agencyScope.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { validateUpdateCreate, validateUpdateEdit } from "../validators/update.validator.js";
import { validateObjectIdParam } from "../validators/common.validator.js";

const router = Router({ mergeParams: true });
router.param("updateId", validateObjectIdParam);

router.use("/:agencyId", agencyScopeMiddleware);
router.get("/:agencyId", getUpdates);
router.post("/:agencyId", roleMiddleware("admin", "team"), validateUpdateCreate, createUpdate);
router.patch("/:agencyId/:updateId/read", markUpdateRead);
router.patch("/:agencyId/:updateId", roleMiddleware("admin", "team"), validateUpdateEdit, updateClientUpdate);
router.delete("/:agencyId/:updateId", roleMiddleware("admin", "team"), deleteUpdate);

export default router;
