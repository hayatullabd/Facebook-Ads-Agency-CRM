import { Router } from "express";
import {
  approveUser,
  approveWorkspace,
  getPendingUsers,
  getPendingWorkspaces,
  rejectUser,
  rejectWorkspace,
  reviewUser,
  reviewWorkspace,
} from "../controllers/approval.controller.js";
import { PLATFORM_ROLES } from "../constants/roles.js";
import { agencyScopeMiddleware } from "../middlewares/agencyScope.middleware.js";
import { platformRoleMiddleware } from "../middlewares/platformRole.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { validateObjectIdParam } from "../validators/common.validator.js";
import { validateDecision, validateEmptyDecision, validateUserApproval, validateUserDecision } from "../validators/approval.validator.js";

const router = Router();
router.param("agencyId", validateObjectIdParam);
router.param("userId", validateObjectIdParam);

router.get("/workspaces", platformRoleMiddleware(PLATFORM_ROLES.ADMIN), getPendingWorkspaces);
router.patch("/workspaces/:agencyId", platformRoleMiddleware(PLATFORM_ROLES.ADMIN), validateDecision, reviewWorkspace);
router.post("/workspaces/:agencyId/approve", platformRoleMiddleware(PLATFORM_ROLES.ADMIN), validateEmptyDecision, approveWorkspace);
router.post("/workspaces/:agencyId/reject", platformRoleMiddleware(PLATFORM_ROLES.ADMIN), validateEmptyDecision, rejectWorkspace);

router.get("/users/:agencyId", agencyScopeMiddleware, roleMiddleware("admin"), getPendingUsers);
router.patch("/users/:agencyId/:userId", agencyScopeMiddleware, roleMiddleware("admin"), validateUserDecision, reviewUser);
router.post("/users/:agencyId/:userId/approve", agencyScopeMiddleware, roleMiddleware("admin"), validateUserApproval, approveUser);
router.post("/users/:agencyId/:userId/reject", agencyScopeMiddleware, roleMiddleware("admin"), validateEmptyDecision, rejectUser);

export default router;
