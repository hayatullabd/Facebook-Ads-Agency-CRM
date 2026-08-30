import { Router } from "express";
import {
  createRequestAttachment,
  deleteRequestAttachment,
  getRequestAttachments,
} from "../controllers/attachment.controller.js";
import { agencyScopeMiddleware } from "../middlewares/agencyScope.middleware.js";
import { validateAttachmentCreate } from "../validators/attachment.validator.js";
import { validateObjectIdParam } from "../validators/common.validator.js";

const router = Router({ mergeParams: true });
router.param("requestId", validateObjectIdParam);
router.param("attachmentId", validateObjectIdParam);
router.use("/:agencyId", agencyScopeMiddleware);
router.get("/:agencyId/:requestId", getRequestAttachments);
router.post("/:agencyId/:requestId", validateAttachmentCreate, createRequestAttachment);
router.delete("/:agencyId/:requestId/:attachmentId", deleteRequestAttachment);
export default router;
