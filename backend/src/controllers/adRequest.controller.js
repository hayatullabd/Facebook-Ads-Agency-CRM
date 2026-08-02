import AdRequest from "../models/AdRequest.model.js";
import { transitionAdRequestStatus } from "../services/adRequest.service.js";
import { getNextRequestNumber } from "../services/requestNumber.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createFields = ["pageName", "platform", "objectiveGroup", "objective", "budget", "durationDays", "notes", "contentLink"];
const pickRequestFields = (body) => Object.fromEntries(createFields.filter((field) => body[field] !== undefined).map((field) => [field, body[field]]));

export const getAdRequests = asyncHandler(async (req, res) => {
  const query = { agency: req.params.agencyId };
  if (["client", "moderator"].includes(req.user.role)) query.client = req.user.client;
  const requests = await AdRequest.find(query).populate("client submittedBy reviewedBy").sort({ createdAt: -1 });
  res.json(new ApiResponse(200, requests));
});

export const createAdRequest = asyncHandler(async (req, res) => {
  const agency = req.params.agencyId;
  const client = ["client", "moderator"].includes(req.user.role) ? req.user.client : req.body.client;
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

  res.status(201).json(new ApiResponse(201, request, "Ad request submitted"));
});

export const updateAdRequestStatus = asyncHandler(async (req, res) => {
  const request = await transitionAdRequestStatus({ agencyId: req.params.agencyId, requestId: req.params.requestId, actorId: req.user._id, ...req.body });
  res.json(new ApiResponse(200, request, "Request status updated"));
});
