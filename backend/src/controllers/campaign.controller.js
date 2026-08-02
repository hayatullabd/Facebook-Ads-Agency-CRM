import Campaign from "../models/Campaign.model.js";
import { validateClientAndRequest } from "../utils/validateTenantRelations.js";
import { getClientCampaignVisibility, setCampaignClientAssignment } from "../services/campaignAssignment.service.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const mutableFields = ["client", "adRequest", "facebookCampaignId", "name", "platform", "objective", "status", "budget", "startDate", "endDate", "performance"];
const pickCampaignFields = (body) => Object.fromEntries(
  mutableFields.filter((field) => body[field] !== undefined).map((field) => [field, body[field]])
);

export const getCampaigns = asyncHandler(async (req, res) => {
  const agency = req.params.agencyId;
  let query = { agency };
  if (["client", "moderator"].includes(req.user.role)) {
    query = await getClientCampaignVisibility(agency, req.user.client);
  }
  if (req.query.facebookAdAccountId) {
    query = { $and: [query, { agency, facebookAdAccountId: req.query.facebookAdAccountId }] };
  }
  const campaigns = await Campaign.find(query).populate("client adRequest").sort({ createdAt: -1 });
  res.json(new ApiResponse(200, campaigns));
});

export const createCampaign = asyncHandler(async (req, res) => {
  await validateClientAndRequest({ agencyId: req.params.agencyId, clientId: req.body.client, adRequestId: req.body.adRequest });
  const campaign = await Campaign.create({ ...pickCampaignFields(req.body), agency: req.params.agencyId });
  res.status(201).json(new ApiResponse(201, campaign, "Campaign created"));
});

export const updateCampaign = asyncHandler(async (req, res) => {
  const existing = await Campaign.findOne({ _id: req.params.campaignId, agency: req.params.agencyId });
  if (!existing) throw new ApiError(404, "Campaign not found");
  const clientId = req.body.client ?? existing.client;
  const adRequestId = req.body.adRequest ?? existing.adRequest;
  if (existing.source !== "facebook" || clientId || adRequestId) {
    await validateClientAndRequest({
      agencyId: req.params.agencyId,
      clientId,
      adRequestId,
      requireRequest: existing.source !== "facebook",
    });
  }
  const campaign = await Campaign.findOneAndUpdate(
    { _id: req.params.campaignId, agency: req.params.agencyId },
    pickCampaignFields(req.body),
    { new: true, runValidators: true }
  );
  if (!campaign) throw new ApiError(404, "Campaign not found");
  res.json(new ApiResponse(200, campaign, "Campaign updated"));
});

export const assignCampaignClient = asyncHandler(async (req, res) => {
  const campaign = await setCampaignClientAssignment({
    agencyId: req.params.agencyId,
    campaignId: req.params.campaignId,
    clientId: req.body.clientId,
  });
  res.json(new ApiResponse(200, campaign, req.body.clientId ? "Campaign assigned" : "Campaign unassigned"));
});
