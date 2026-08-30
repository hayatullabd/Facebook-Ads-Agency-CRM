import { Router } from "express";
import {
  createRequestComment,
  deleteRequestComment,
  getRequestComments,
  updateRequestComment,
} from "../controllers/comment.controller.js";
import { agencyScopeMiddleware } from "../middlewares/agencyScope.middleware.js";
import { validateCommentCreate, validateCommentUpdate } from "../validators/comment.validator.js";
import { validateObjectIdParam } from "../validators/common.validator.js";

const router = Router({ mergeParams: true });
router.param("requestId", validateObjectIdParam);
router.param("commentId", validateObjectIdParam);
router.use("/:agencyId", agencyScopeMiddleware);
router.get("/:agencyId/:requestId", getRequestComments);
router.post("/:agencyId/:requestId", validateCommentCreate, createRequestComment);
router.patch("/:agencyId/:requestId/:commentId", validateCommentUpdate, updateRequestComment);
router.delete("/:agencyId/:requestId/:commentId", deleteRequestComment);
export default router;
