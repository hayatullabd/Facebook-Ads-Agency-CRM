import Campaign from "../models/Campaign.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const mutableFields = ["client", "adRequest", "facebookCampaignId", "name", "platform", "objective", "status", "budget", "startDate", "endDate", "performance"];
const pickCampaignFields = (body) => Object.fromEntries(
  mutableFields.filter((field) => body[field] !== undefined).map((field) => [field, body[field]])
);

export const getCampaigns = asyncHandler(async (req, res) => {
  const query = { agency: req.params.agencyId };
  if (["client", "moderator"].includes(req.user.role)) query.client = req.user.client;
  const campaigns = await Campaign.find(query).populate("client adRequest").sort({ createdAt: -1 });
  res.json(new ApiResponse(200, campaigns));
});

export const createCampaign = asyncHandler(async (req, res) => {
  const campaign = await Campaign.create({ ...pickCampaignFields(req.body), agency: req.params.agencyId });
  res.status(201).json(new ApiResponse(201, campaign, "Campaign created"));
});

export const updateCampaign = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findOneAndUpdate(
    { _id: req.params.campaignId, agency: req.params.agencyId },
    pickCampaignFields(req.body),
    { new: true, runValidators: true }
  );
  if (!campaign) throw new ApiError(404, "Campaign not found");
  res.json(new ApiResponse(200, campaign, "Campaign updated"));
});
