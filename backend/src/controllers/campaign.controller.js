import Campaign from "../models/Campaign.model.js";
import ApiCredential from "../models/ApiCredential.model.js";
import { getClientCampaignVisibility, setCampaignClientAssignment, setCampaignRequestAssignment } from "../services/campaignAssignment.service.js";
import { fetchFacebookAccountReport, fetchFacebookCampaignDelivery, fetchFacebookCampaignInsights } from "../services/facebookOverview.service.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getCampaigns = asyncHandler(async (req, res) => {
  const agency = req.params.agencyId;
  let query = { agency, source: "facebook" };
  if (["client", "moderator"].includes(req.user.role)) {
    query = { $and: [await getClientCampaignVisibility(agency, req.user.client), { source: "facebook" }] };
  }
  if (req.query.facebookAdAccountId) {
    query = { $and: [query, { agency, facebookAdAccountId: req.query.facebookAdAccountId }] };
  }
  const campaigns = await Campaign.find(query).populate("client", "name contactName").populate("adRequest", "requestNumber pageName status client").sort({ createdAt: -1 }).limit(3000).lean();
  res.json(new ApiResponse(200, campaigns));
});

export const getAccountReport = asyncHandler(async (req, res) => {
  if (["client", "moderator"].includes(req.user.role)) {
    res.json(new ApiResponse(200, [], "Facebook account report retrieved"));
    return;
  }
  const rows = await fetchFacebookAccountReport({ agencyId: req.params.agencyId, since: req.query.since, until: req.query.until });
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
    .limit(3000)
    .lean();

  const credential = await ApiCredential.findOne({ agency }).select("+accessToken adAccounts isConnected tokenExpiresAt");
  if (!credential) throw new ApiError(404, "Facebook connection was not found for this agency");
  const accessToken = credential.accessToken?.trim() || "";
  if (!credential.isConnected || !accessToken) throw new ApiError(409, "Facebook is not connected for this agency");
  if (credential.tokenExpiresAt && credential.tokenExpiresAt <= new Date()) throw new ApiError(409, "Facebook access token has expired; reconnect Facebook");

  const isClientView = ["client", "moderator"].includes(req.user.role);
  const accountCurrencies = new Map((credential.adAccounts || []).map((account) => [account.facebookAdAccountId, account.currency]));
  const storedAccountIds = campaigns.map((campaign) => campaign.facebookAdAccountId).filter(Boolean);
  const connectedAccountIds = (credential.adAccounts || [])
    .filter((account) => account.isAccessible !== false && account.facebookAdAccountId)
    .map((account) => account.facebookAdAccountId);
  const accountIds = isClientView
    ? [...new Set(storedAccountIds)]
    : [...new Set([...connectedAccountIds, ...storedAccountIds])];

  const insightsByCampaign = new Map();
  const deliveryByCampaign = new Map();
  await Promise.all(accountIds.map(async (facebookAdAccountId) => {
    const [insightPayload, delivery] = await Promise.all([
      fetchFacebookCampaignInsights({
        facebookAdAccountId,
        accessToken,
        since: req.query.since,
        until: req.query.until,
        currency: accountCurrencies.get(facebookAdAccountId),
      }),
      fetchFacebookCampaignDelivery(facebookAdAccountId, accessToken),
    ]);
    for (const row of insightPayload.rows) insightsByCampaign.set(`${facebookAdAccountId}:${row.facebookCampaignId}`, row);
    for (const [id, status] of delivery) deliveryByCampaign.set(`${facebookAdAccountId}:${id}`, { ...status, resultMetric: insightPayload.resultMetrics.get(id) || status.resultMetric || "" });
  }));

  const knownIds = new Set(campaigns.map((campaign) => String(campaign.facebookCampaignId || "")));
  const rows = campaigns.map((campaign) => {
    const insight = insightsByCampaign.get(`${campaign.facebookAdAccountId}:${campaign.facebookCampaignId}`);
    const liveStatus = deliveryByCampaign.get(`${campaign.facebookAdAccountId}:${campaign.facebookCampaignId}`);
    const accountCurrency = String(accountCurrencies.get(campaign.facebookAdAccountId) || campaign.performance?.currency || campaign.budget?.currency || "USD").toUpperCase();
    const performance = insight || {
      actions: [], results: 0, resultMetric: "", landingPageViews: 0, spend: 0, amountSpent: 0,
      costPerResult: 0, ctrAll: 0, reach: 0, impressions: 0, currency: accountCurrency, sourceCurrency: accountCurrency,
    };
    return {
      ...campaign,
      status: liveStatus?.status || campaign.status,
      effectiveStatus: liveStatus?.effectiveStatus || campaign.effectiveStatus,
      facebookStatus: liveStatus?.facebookStatus || campaign.facebookStatus,
      startDate: liveStatus?.startDate || campaign.startDate,
      endDate: liveStatus?.endDate || campaign.endDate,
      performance: {
        ...performance,
        resultMetric: performance.resultMetric || liveStatus?.resultMetric || "",
        delivery: liveStatus?.delivery || insight?.effectiveStatus || campaign.effectiveStatus || "",
        since: req.query.since,
        until: req.query.until,
      },
    };
  });
  const extras = [];
  if (!isClientView) for (const [key, insight] of insightsByCampaign) {
    if (knownIds.has(String(insight.facebookCampaignId || ""))) continue;
    const splitAt = key.lastIndexOf(":");
    const liveStatus = deliveryByCampaign.get(key);
    extras.push({
      _id: `live-${insight.facebookCampaignId}`,
      source: "facebook",
      liveOnly: true,
      name: insight.name || "Facebook campaign",
      facebookCampaignId: insight.facebookCampaignId,
      facebookAdAccountId: key.slice(0, splitAt),
      platform: "facebook",
      objective: insight.objective || "",
      facebookObjective: insight.objective || "",
      status: liveStatus?.status || insight.status || "active",
      effectiveStatus: liveStatus?.effectiveStatus || insight.effectiveStatus || "",
      facebookStatus: liveStatus?.facebookStatus || insight.facebookStatus || "",
      budget: insight.budget || { amount: null, type: null, currency: "USD" },
      startDate: insight.startDate || null,
      endDate: insight.endDate || null,
      performance: {
        actions: insight.actions || [],
        results: insight.results || 0,
        resultMetric: insight.resultMetric || liveStatus?.resultMetric || "",
        landingPageViews: insight.landingPageViews || 0,
        spend: insight.spend || 0,
        amountSpent: insight.amountSpent ?? insight.spend ?? 0,
        costPerResult: insight.costPerResult || 0,
        ctrAll: insight.ctrAll || 0,
        reach: insight.reach || 0,
        impressions: insight.impressions || 0,
        currency: insight.currency || insight.sourceCurrency || "USD",
        sourceCurrency: insight.sourceCurrency || insight.currency || "USD",
        delivery: liveStatus?.delivery || insight.effectiveStatus || "",
        since: req.query.since,
        until: req.query.until,
      },
    });
  }
  if (!isClientView) for (const [key, liveStatus] of deliveryByCampaign) {
    if (insightsByCampaign.has(key)) continue;
    const splitAt = key.lastIndexOf(":");
    const facebookCampaignId = key.slice(splitAt + 1);
    const facebookAdAccountId = key.slice(0, splitAt);
    if (!facebookCampaignId || knownIds.has(facebookCampaignId)) continue;
    const accountCurrency = String(accountCurrencies.get(facebookAdAccountId) || "USD").toUpperCase();
    extras.push({
      _id: `live-${facebookCampaignId}`,
      source: "facebook",
      liveOnly: true,
      name: liveStatus.name || "Facebook campaign",
      facebookCampaignId,
      facebookAdAccountId,
      platform: "facebook",
      objective: liveStatus.objective || "",
      facebookObjective: liveStatus.objective || "",
      status: liveStatus.status || "paused",
      effectiveStatus: liveStatus.effectiveStatus || "",
      facebookStatus: liveStatus.facebookStatus || "",
      budget: { amount: null, type: null, currency: accountCurrency },
      startDate: liveStatus.startDate || null,
      endDate: liveStatus.endDate || null,
      performance: {
        actions: [], results: 0, resultMetric: liveStatus.resultMetric || "", landingPageViews: 0, spend: 0, amountSpent: 0,
        costPerResult: 0, ctrAll: 0, reach: 0, impressions: 0, currency: accountCurrency, sourceCurrency: accountCurrency,
        delivery: liveStatus.delivery || "",
        since: req.query.since,
        until: req.query.until,
      },
    });
  }
  extras.sort((left, right) => (right.performance.amountSpent || 0) - (left.performance.amountSpent || 0));
  const statusWrites = rows.flatMap((row) => {
    if (row.source !== "facebook") return [];
    const previous = campaigns.find((campaign) => String(campaign._id) === String(row._id));
    if (!previous) return [];
    if (previous.status === row.status && previous.effectiveStatus === row.effectiveStatus && previous.facebookStatus === row.facebookStatus && (previous.performance?.delivery || "") === (row.performance.delivery || "")) return [];
    return [{ updateOne: { filter: { _id: row._id, agency }, update: { $set: { status: row.status, effectiveStatus: row.effectiveStatus || "", facebookStatus: row.facebookStatus || "", "performance.delivery": row.performance.delivery || "" } } } }];
  });
  if (statusWrites.length) await Campaign.bulkWrite(statusWrites, { ordered: false });
  if (extras.length) {
    await Campaign.bulkWrite(extras.map((row) => ({
      updateOne: {
        filter: { agency, source: "facebook", facebookAdAccountId: row.facebookAdAccountId, facebookCampaignId: row.facebookCampaignId },
        update: {
          $set: {
            name: row.name,
            facebookObjective: row.facebookObjective,
            facebookStatus: row.facebookStatus,
            effectiveStatus: row.effectiveStatus,
            status: row.status,
            budget: row.budget,
            startDate: row.startDate,
            endDate: row.endDate,
            lastSeenAt: new Date(),
            isStale: false,
            performance: {
              spend: row.performance.spend,
              amountSpent: row.performance.amountSpent,
              reach: row.performance.reach,
              impressions: row.performance.impressions,
              results: row.performance.results,
              resultMetric: row.performance.resultMetric,
              actions: row.performance.actions,
              ctrAll: row.performance.ctrAll,
              costPerResult: row.performance.costPerResult,
              currency: row.performance.currency || row.budget?.currency || "USD",
              sourceCurrency: row.performance.sourceCurrency || row.performance.currency || row.budget?.currency || "USD",
              delivery: row.performance.delivery,
              usdConversionAvailable: true,
              lastSyncedAt: new Date(),
            },
          },
          $setOnInsert: {
            agency,
            source: "facebook",
            facebookCampaignId: row.facebookCampaignId,
            facebookAdAccountId: row.facebookAdAccountId,
            platform: "facebook",
            objective: row.objective || "",
          },
        },
        upsert: true,
      },
    })), { ordered: false });
  }
  res.json(new ApiResponse(200, [...extras, ...rows], "Campaign insights retrieved"));
});

export const assignCampaignClient = asyncHandler(async (req, res) => {
  const campaign = await setCampaignClientAssignment({
    agencyId: req.params.agencyId,
    campaignId: req.params.campaignId,
    clientId: req.body.clientId,
  });
  res.json(new ApiResponse(200, campaign, req.body.clientId ? "Campaign assigned" : "Campaign unassigned"));
});

export const assignCampaignRequest = asyncHandler(async (req, res) => {
  const campaign = await setCampaignRequestAssignment({
    agencyId: req.params.agencyId,
    campaignId: req.params.campaignId,
    adRequestId: req.body.adRequestId,
  });
  res.json(new ApiResponse(200, campaign, req.body.adRequestId ? "Ad request linked" : "Ad request removed"));
});
