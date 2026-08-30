import Comment from "../models/Comment.model.js";
import { findScopedAdRequest } from "./adRequest.service.js";
import { ApiError } from "../utils/ApiError.js";

const populateAuthor = { path: "author", select: "name role" };

const findComment = async ({ agencyId, requestId, commentId, actor }) => {
  await findScopedAdRequest({ agencyId, requestId, actor });
  const comment = await Comment.findOne({ _id: commentId, agency: agencyId, adRequest: requestId });
  if (!comment) throw new ApiError(404, "Comment not found");
  return comment;
};

const assertCanModify = (comment, actor) => {
  if (actor.role !== "admin" && String(comment.author) !== String(actor._id)) {
    throw new ApiError(403, "You may modify only your own comments");
  }
};

export const getRequestComments = async ({ agencyId, requestId, actor }) => {
  await findScopedAdRequest({ agencyId, requestId, actor });
  return Comment.find({ agency: agencyId, adRequest: requestId }).populate(populateAuthor).sort({ createdAt: 1 });
};

export const createRequestComment = async ({ agencyId, requestId, actor, content }) => {
  const request = await findScopedAdRequest({ agencyId, requestId, actor });
  const comment = await Comment.create({ agency: agencyId, client: request.client, adRequest: requestId, author: actor._id, content });
  return comment.populate(populateAuthor);
};

export const updateRequestComment = async ({ agencyId, requestId, commentId, actor, content }) => {
  const comment = await findComment({ agencyId, requestId, commentId, actor });
  assertCanModify(comment, actor);
  comment.content = content;
  await comment.save();
  return comment.populate(populateAuthor);
};

export const deleteRequestComment = async ({ agencyId, requestId, commentId, actor }) => {
  const comment = await findComment({ agencyId, requestId, commentId, actor });
  assertCanModify(comment, actor);
  await comment.deleteOne();
};
