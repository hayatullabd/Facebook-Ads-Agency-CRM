import ActivityLog from "../models/ActivityLog.model.js";
import AdRequest from "../models/AdRequest.model.js";
import { ApiError } from "../utils/ApiError.js";

export const transitionAdRequestStatus = async ({ agencyId, requestId, actorId, status, agencyNote, rejectionReason }) => {
  const request = await AdRequest.findOneAndUpdate(
    { _id: requestId, agency: agencyId },
    {
      status,
      agencyNote,
      rejectionReason,
      reviewedBy: actorId,
      reviewedAt: new Date(),
      ...(status === "Approved" ? { approvedAt: new Date() } : {}),
      ...(status === "Live" ? { launchedAt: new Date() } : {}),
    },
    { new: true, runValidators: true }
  );
  if (!request) throw new ApiError(404, "Ad request not found");
  await ActivityLog.create({
    agency: agencyId,
    actor: actorId,
    client: request.client,
    adRequest: request._id,
    entityType: "ad_request",
    entityId: request._id,
    action: "status_changed",
    detail: `Request status changed to ${status}`,
  });
  return request;
};
