import Attachment from "../models/Attachment.model.js";
import { findScopedAdRequest } from "./adRequest.service.js";
import { ApiError } from "../utils/ApiError.js";

const populateUploader = { path: "uploadedBy", select: "name role" };

export const getRequestAttachments = async ({ agencyId, requestId, actor }) => {
  await findScopedAdRequest({ agencyId, requestId, actor });
  return Attachment.find({ agency: agencyId, adRequest: requestId }).populate(populateUploader).sort({ createdAt: 1 });
};

export const createRequestAttachment = async ({ agencyId, requestId, actor, data }) => {
  const request = await findScopedAdRequest({ agencyId, requestId, actor });
  const attachment = await Attachment.create({
    agency: agencyId,
    client: request.client,
    adRequest: requestId,
    uploadedBy: actor._id,
    ...data,
  });
  return attachment.populate(populateUploader);
};

export const deleteRequestAttachment = async ({ agencyId, requestId, attachmentId, actor }) => {
  await findScopedAdRequest({ agencyId, requestId, actor });
  const attachment = await Attachment.findOne({ _id: attachmentId, agency: agencyId, adRequest: requestId });
  if (!attachment) throw new ApiError(404, "Attachment not found");
  if (actor.role !== "admin" && String(attachment.uploadedBy) !== String(actor._id)) {
    throw new ApiError(403, "You may delete only your own attachments");
  }
  await attachment.deleteOne();
};
