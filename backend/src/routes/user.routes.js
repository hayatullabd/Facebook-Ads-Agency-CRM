import { Router } from "express";
import { createUser, getUsers, removeUser } from "../controllers/user.controller.js";
import { agencyScopeMiddleware } from "../middlewares/agencyScope.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { validateUserCreate } from "../validators/user.validator.js";
import { validateObjectIdParam } from "../validators/common.validator.js";

const router = Router({ mergeParams: true });

router.param("userId", validateObjectIdParam);

router.use("/:agencyId", agencyScopeMiddleware);
router.get("/:agencyId", getUsers);
router.post("/:agencyId", roleMiddleware("admin", "team", "client"), validateUserCreate, createUser);
router.delete("/:agencyId/:userId", roleMiddleware("admin", "team", "client"), removeUser);

export default router;
