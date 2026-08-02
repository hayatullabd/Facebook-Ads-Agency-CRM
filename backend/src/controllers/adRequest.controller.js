import AdRequest from "../models/AdRequest.model.js";
import ActivityLog from "../models/ActivityLog.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateId } from "../utils/generateId.js";

const createFields = ["pageName", "platform", "objectiveGroup", "objective", "budget", "durationDays", "notes"];
const pickRequestFields = (body) => Object.fromEntries(
  createFields.filter((field) => body[field] !== undefined).map((field) => [field, body[field]])
);

export const getAdRequests = asyncHandler(async (req, res) => {
  const query = { agency: req.params.agencyId };
  if (["client", "moderator"].includes(req.user.role)) query.client = req.user.client;
  const requests = await AdRequest.find(query).populate("client submittedBy reviewedBy").sort({ createdAt: -1 });
  res.json(new ApiResponse(200, requests));
});

export const createAdRequest = asyncHandler(async (req, res) => {
  const client = ["client", "moderator"].includes(req.user.role) ? req.user.client : req.body.client;
  const request = await AdRequest.create({
    ...pickRequestFields(req.body),
    client,
    agency: req.params.agencyId,
    requestNumber: generateId("REQ"),
    submittedBy: req.user._id,
  });

  res.status(201).json(new ApiResponse(201, request, "Ad request submitted"));
});

export const updateAdRequestStatus = asyncHandler(async (req, res) => {
  const { status, agencyNote, rejectionReason } = req.body;
  const request = await AdRequest.findOneAndUpdate(
    { _id: req.params.requestId, agency: req.params.agencyId },
    {
      status,
      agencyNote,
      rejectionReason,
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
      ...(status === "Approved" ? { approvedAt: new Date() } : {}),
      ...(status === "Live" ? { launchedAt: new Date() } : {}),
    },
    { new: true, runValidators: true }
  );

  if (!request) throw new ApiError(404, "Ad request not found");

  await ActivityLog.create({
    agency: req.params.agencyId,
    actor: req.user._id,
    client: request.client,
    adRequest: request._id,
    entityType: "ad_request",
    entityId: request._id,
    action: "status_changed",
    detail: `Request status changed to ${status}`,
  });

  res.json(new ApiResponse(200, request, "Request status updated"));
});
