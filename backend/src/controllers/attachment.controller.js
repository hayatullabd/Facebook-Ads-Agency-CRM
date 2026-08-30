import {
  createRequestAttachment as createRequestAttachmentService,
  deleteRequestAttachment as deleteRequestAttachmentService,
  getRequestAttachments as getRequestAttachmentsService,
} from "../services/attachment.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getRequestAttachments = asyncHandler(async (req, res) => {
  const attachments = await getRequestAttachmentsService({ agencyId: req.params.agencyId, requestId: req.params.requestId, actor: req.user });
  res.json(new ApiResponse(200, attachments));
});

export const createRequestAttachment = asyncHandler(async (req, res) => {
  const attachment = await createRequestAttachmentService({
    agencyId: req.params.agencyId,
    requestId: req.params.requestId,
    actor: req.user,
    data: req.body,
  });
  res.status(201).json(new ApiResponse(201, attachment, "Attachment added"));
});

export const deleteRequestAttachment = asyncHandler(async (req, res) => {
  await deleteRequestAttachmentService({
    agencyId: req.params.agencyId,
    requestId: req.params.requestId,
    attachmentId: req.params.attachmentId,
    actor: req.user,
  });
  res.json(new ApiResponse(200, null, "Attachment deleted"));
});
