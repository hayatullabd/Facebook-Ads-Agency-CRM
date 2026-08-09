import Campaign from "../models/Campaign.model.js";
import ApiCredential from "../models/ApiCredential.model.js";
import { getClientCampaignVisibility, setCampaignClientAssignment } from "../services/campaignAssignment.service.js";
import { fetchFacebookAccountReport, fetchFacebookCampaignInsights } from "../services/facebookOverview.service.js";
import { validateClientAndAdRequest } from "../services/referenceValidation.service.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createFields = ["client", "adRequest", "facebookCampaignId", "name", "platform", "objective", "status", "budget", "startDate", "endDate", "performance"];
const updateFields = ["client", "adRequest", "name", "objective", "status", "budget"];
const pickCampaignFields = (body, fields = createFields) => Object.fromEntries(
  fields.filter((field) => body[field] !== undefined).map((field) => [field, body[field]])
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

export const getAccountReport = asyncHandler(async (req, res) => {
  const clientId = ["client", "moderator"].includes(req.user.role) ? req.user.client : null;
  const rows = await fetchFacebookAccountReport({ agencyId: req.params.agencyId, since: req.query.since, until: req.query.until, clientId });
  res.json(new ApiResponse(200, rows, "Facebook account report retrieved"));
});

export const getCampaignInsights = asyncHandler(async (req, res) => {
  const agency = req.params.agencyId;
  let visibility = { agency };
  if (["client", "moderator"].includes(req.user.role)) {
    visibility = await getClientCampaignVisibility(agency, req.user.client);
  }
  const campaigns = await Campaign.find({ $and: [visibility, { source: "facebook" }] })
    .select("source facebookCampaignId facebookAdAccountId name platform objective facebookObjective status effectiveStatus facebookStatus budget startDate endDate client adRequest isStale")
    .sort({ createdAt: -1 })
    .lean();

  const credential = await ApiCredential.findOne({ agency }).select("+accessToken adAccounts isConnected tokenExpiresAt");
  if (!credential) throw new ApiError(404, "Facebook connection was not found for this agency");
  const accessToken = credential.accessToken?.trim() || "";
  if (!credential.isConnected || !accessToken) throw new ApiError(409, "Facebook is not connected for this agency");
  if (credential.tokenExpiresAt && credential.tokenExpiresAt <= new Date()) throw new ApiError(409, "Facebook access token has expired; reconnect Facebook");

  const accountCurrencies = new Map((credential.adAccounts || []).map((account) => [account.facebookAdAccountId, account.currency]));
  const campaignsByAccount = new Map();
  for (const campaign of campaigns) {
    if (!campaignsByAccount.has(campaign.facebookAdAccountId)) campaignsByAccount.set(campaign.facebookAdAccountId, []);
    campaignsByAccount.get(campaign.facebookAdAccountId).push(campaign);
  }

  const insightsByCampaign = new Map();
  await Promise.all([...campaignsByAccount.keys()].map(async (facebookAdAccountId) => {
    const rows = await fetchFacebookCampaignInsights({
      facebookAdAccountId,
      accessToken,
      since: req.query.since,
      until: req.query.until,
      currency: accountCurrencies.get(facebookAdAccountId),
    });
    for (const row of rows) insightsByCampaign.set(`${facebookAdAccountId}:${row.facebookCampaignId}`, row);
  }));

  const rows = campaigns.map((campaign) => {
    const insight = insightsByCampaign.get(`${campaign.facebookAdAccountId}:${campaign.facebookCampaignId}`);
    const performance = insight || {
      actions: [], results: 0, resultMetric: "", landingPageViews: 0, spend: 0, amountSpent: 0,
      costPerResult: 0, ctrAll: 0, reach: 0, impressions: 0, currency: "USD",
    };
    return {
      ...campaign,
      performance: {
        ...performance,
        delivery: campaign.effectiveStatus || "",
        since: req.query.since,
        until: req.query.until,
      },
    };
  });
  res.json(new ApiResponse(200, rows, "Campaign insights retrieved"));
});

export const createCampaign = asyncHandler(async (req, res) => {
  const fields = pickCampaignFields(req.body);
  await validateClientAndAdRequest({ agencyId: req.params.agencyId, clientId: fields.client, adRequestId: fields.adRequest });
  const campaign = await Campaign.create({ ...fields, agency: req.params.agencyId });
  res.status(201).json(new ApiResponse(201, campaign, "Campaign created"));
});

export const updateCampaign = asyncHandler(async (req, res) => {
  const fields = pickCampaignFields(req.body, updateFields);
  const existing = await Campaign.findOne({ _id: req.params.campaignId, agency: req.params.agencyId }).select("client adRequest source");
  if (!existing) throw new ApiError(404, "Campaign not found");
  if (existing.source === "facebook") throw new ApiError(409, "Facebook campaigns can only be changed through dedicated assignment or sync operations");
  if (fields.client !== undefined || fields.adRequest !== undefined) {
    await validateClientAndAdRequest({
      agencyId: req.params.agencyId,
      clientId: fields.client ?? existing.client,
      adRequestId: fields.adRequest ?? existing.adRequest,
    });
  }
  const campaign = await Campaign.findOneAndUpdate(
    { _id: req.params.campaignId, agency: req.params.agencyId },
    fields,
    { new: true, runValidators: true }
  );
  res.json(new ApiResponse(200, campaign, "Campaign updated"));
});

export const deleteCampaign = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findOne({ _id: req.params.campaignId, agency: req.params.agencyId }).select("source");
  if (!campaign) throw new ApiError(404, "Campaign not found");
  if (campaign.source !== "crm") throw new ApiError(409, "Facebook campaigns cannot be deleted");
  await campaign.deleteOne();
  res.json(new ApiResponse(200, null, "Campaign deleted"));
});

export const assignCampaignClient = asyncHandler(async (req, res) => {
  const campaign = await setCampaignClientAssignment({
    agencyId: req.params.agencyId,
    campaignId: req.params.campaignId,
    clientId: req.body.clientId,
  });
  res.json(new ApiResponse(200, campaign, req.body.clientId ? "Campaign assigned" : "Campaign unassigned"));
});
