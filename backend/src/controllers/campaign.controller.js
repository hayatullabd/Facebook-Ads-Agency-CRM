import Campaign from "../models/Campaign.model.js";
import { getClientCampaignVisibility, setCampaignClientAssignment } from "../services/campaignAssignment.service.js";
import { validateClientAndAdRequest } from "../services/referenceValidation.service.js";
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
  const fields = pickCampaignFields(req.body);
  await validateClientAndAdRequest({ agencyId: req.params.agencyId, clientId: fields.client, adRequestId: fields.adRequest });
  const campaign = await Campaign.create({ ...fields, agency: req.params.agencyId });
  res.status(201).json(new ApiResponse(201, campaign, "Campaign created"));
});

export const updateCampaign = asyncHandler(async (req, res) => {
  const fields = pickCampaignFields(req.body);
  const existing = await Campaign.findOne({ _id: req.params.campaignId, agency: req.params.agencyId }).select("client adRequest source");
  if (!existing) throw new ApiError(404, "Campaign not found");
  if (fields.client !== undefined || fields.adRequest !== undefined) {
    await validateClientAndAdRequest({
      agencyId: req.params.agencyId,
      clientId: fields.client ?? existing.client,
      adRequestId: fields.adRequest ?? existing.adRequest,
      required: existing.source !== "facebook",
    });
  }
  const campaign = await Campaign.findOneAndUpdate(
    { _id: req.params.campaignId, agency: req.params.agencyId },
    fields,
    { new: true, runValidators: true }
  );
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
