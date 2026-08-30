import {
  createRequestComment as createRequestCommentService,
  deleteRequestComment as deleteRequestCommentService,
  getRequestComments as getRequestCommentsService,
  updateRequestComment as updateRequestCommentService,
} from "../services/comment.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getRequestComments = asyncHandler(async (req, res) => {
  const comments = await getRequestCommentsService({ agencyId: req.params.agencyId, requestId: req.params.requestId, actor: req.user });
  res.json(new ApiResponse(200, comments));
});

export const createRequestComment = asyncHandler(async (req, res) => {
  const comment = await createRequestCommentService({
    agencyId: req.params.agencyId,
    requestId: req.params.requestId,
    actor: req.user,
    content: req.body.content,
  });
  res.status(201).json(new ApiResponse(201, comment, "Comment added"));
});

export const updateRequestComment = asyncHandler(async (req, res) => {
  const comment = await updateRequestCommentService({
    agencyId: req.params.agencyId,
    requestId: req.params.requestId,
    commentId: req.params.commentId,
    actor: req.user,
    content: req.body.content,
  });
  res.json(new ApiResponse(200, comment, "Comment updated"));
});

export const deleteRequestComment = asyncHandler(async (req, res) => {
  await deleteRequestCommentService({ agencyId: req.params.agencyId, requestId: req.params.requestId, commentId: req.params.commentId, actor: req.user });
  res.json(new ApiResponse(200, null, "Comment deleted"));
});
