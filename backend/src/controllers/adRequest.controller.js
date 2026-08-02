import AdRequest from "../models/AdRequest.model.js";
import {
  deleteAdRequest as deleteAdRequestService,
  getAdRequestActivity as getAdRequestActivityService,
  getAdRequestDetails as getAdRequestDetailsService,
  recordAdRequestCreated,
  transitionAdRequestStatus,
  updateAdRequest as updateAdRequestService,
  validateRequestClient,
} from "../services/adRequest.service.js";
import { getNextRequestNumber } from "../services/requestNumber.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createFields = ["pageName", "platform", "objectiveGroup", "objective", "budget", "durationDays", "notes", "contentLink"];
const pickRequestFields = (body) => Object.fromEntries(createFields.filter((field) => body[field] !== undefined).map((field) => [field, body[field]]));

export const getAdRequests = asyncHandler(async (req, res) => {
  const query = { agency: req.params.agencyId };
  if (["client", "moderator"].includes(req.user.role)) query.client = req.user.client;
  const requests = await AdRequest.find(query)
    .populate({ path: "client", select: "name contactName" })
    .populate({ path: "submittedBy", select: "name" })
    .populate({ path: "reviewedBy", select: "name" })
    .sort({ createdAt: -1 });
  res.json(new ApiResponse(200, requests));
});

export const createAdRequest = asyncHandler(async (req, res) => {
  const agency = req.params.agencyId;
  const client = ["client", "moderator"].includes(req.user.role) ? req.user.client : req.body.client;
  await validateRequestClient(agency, client);
  let request;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const requestNumber = await getNextRequestNumber(agency);
    try {
      request = await AdRequest.create({ ...pickRequestFields(req.body), client, agency, requestNumber, submittedBy: req.user._id });
      break;
    } catch (error) {
      if (error?.code !== 11000 || attempt === 2) throw error;
    }
  }

  try {
    await recordAdRequestCreated({ request, actorId: req.user._id });
  } catch {}
  res.status(201).json(new ApiResponse(201, request, "Ad request submitted"));
});

export const getAdRequestDetails = asyncHandler(async (req, res) => {
  const request = await getAdRequestDetailsService({ agencyId: req.params.agencyId, requestId: req.params.requestId, actor: req.user });
  res.json(new ApiResponse(200, request));
});

export const getAdRequestActivity = asyncHandler(async (req, res) => {
  const activity = await getAdRequestActivityService({ agencyId: req.params.agencyId, requestId: req.params.requestId, actor: req.user });
  res.json(new ApiResponse(200, activity));
});

export const updateAdRequest = asyncHandler(async (req, res) => {
  const request = await updateAdRequestService({ agencyId: req.params.agencyId, requestId: req.params.requestId, actor: req.user, updates: req.body });
  res.json(new ApiResponse(200, request, "Ad request updated"));
});

export const deleteAdRequest = asyncHandler(async (req, res) => {
  await deleteAdRequestService({ agencyId: req.params.agencyId, requestId: req.params.requestId, actor: req.user });
  res.json(new ApiResponse(200, null, "Ad request deleted"));
});

export const updateAdRequestStatus = asyncHandler(async (req, res) => {
  const request = await transitionAdRequestStatus({ agencyId: req.params.agencyId, requestId: req.params.requestId, actor: req.user, ...req.body });
  res.json(new ApiResponse(200, request, "Request status updated"));
});
