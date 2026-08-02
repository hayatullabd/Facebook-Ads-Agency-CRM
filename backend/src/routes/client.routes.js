import { Router } from "express";
import { createClient, deleteClient, getClients, updateClient } from "../controllers/client.controller.js";
import { agencyScopeMiddleware } from "../middlewares/agencyScope.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { validateClientCreate } from "../validators/client.validator.js";
import { validateObjectIdParam } from "../validators/common.validator.js";

const router = Router({ mergeParams: true });
router.param("clientId", validateObjectIdParam);

router.use("/:agencyId", agencyScopeMiddleware);
router.get("/:agencyId", getClients);
router.post("/:agencyId", roleMiddleware("admin", "team"), validateClientCreate, createClient);
router.patch("/:agencyId/:clientId", roleMiddleware("admin", "team"), updateClient);
router.delete("/:agencyId/:clientId", roleMiddleware("admin", "team"), deleteClient);

export default router;
