import { Router } from "express";
import { createUser, getUsers, removeUser } from "../controllers/user.controller.js";
import { validateFields } from "../middlewares/validate.middleware.js";
import { agencyScopeMiddleware } from "../middlewares/agencyScope.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";

const router = Router({ mergeParams: true });

router.use("/:agencyId", agencyScopeMiddleware);
router.get("/:agencyId", getUsers);
router.post(
  "/:agencyId",
  roleMiddleware("admin", "team", "client"),
  validateFields({ name: { required: true, type: "string", minLength: 2 }, email: { required: true, type: "string" }, password: { required: true, type: "string", minLength: 12 }, role: { required: true, type: "string" } }),
  createUser
);
router.delete("/:agencyId/:userId", roleMiddleware("admin", "team", "client"), removeUser);

export default router;
