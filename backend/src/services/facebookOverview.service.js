import { env } from "../config/env.js";
import Agency from "../models/Agency.model.js";
import ApiCredential from "../models/ApiCredential.model.js";
import Campaign from "../models/Campaign.model.js";
import Invoice from "../models/Invoice.model.js";
import { ApiError } from "../utils/ApiError.js";

const GRAPH_API_BASE_URL = "https://graph.facebook.com/v20.0";

function normalizeAdAccountId(adAccountId) {
  return `act_${String(adAccountId || "").replace(/^act_/, "")}`;
}

async function fetchGraphJson(path, accessToken) {
  const url = new URL(`${GRAPH_API_BASE_URL}/${path.replace(/^\//, "")}`);
  url.searchParams.set("access_token", accessToken);

  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(env.facebookRequestTimeoutMs) });
  } catch (error) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      throw new ApiError(504, "Facebook Graph API request timed out");
    }
    throw new ApiError(502, "Facebook Graph API is unavailable");
  }

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new ApiError(502, "Facebook Graph API returned an invalid response");
    }
  }

  if (!response.ok) {
    throw new ApiError(502, "Facebook Graph API request failed");
  }

  return payload || {};
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function formatRecentCampaigns(campaigns) {
  return campaigns.slice(0, 3).map((campaign) => ({
    id: campaign._id,
    name: campaign.name,
    status: campaign.status,
    spend: campaign.performance?.spend ?? 0,
    impressions: campaign.performance?.impressions ?? 0,
    results: campaign.performance?.results ?? 0,
    costPerResult: campaign.performance?.costPerResult ?? 0,
  }));
}

export async function syncFacebookInsightsForAgency(agencyId) {
  const credential = await ApiCredential.findOne({ agency: agencyId }).select("+accessToken");
  const accessToken = credential?.accessToken?.trim() || "";
  const adAccountId = credential?.defaultAdAccountId?.trim() || "";
  const tokenUsable = Boolean(accessToken && adAccountId && credential?.isConnected && (!credential?.tokenExpiresAt || credential.tokenExpiresAt > new Date()));

  if (!tokenUsable) {
    return {
      synced: false,
      mode: credential ? "demo" : "not-connected",
      message: "Add a valid Facebook access token and ad account ID to enable live Graph API sync.",
      overview: await getFacebookOverviewForAgency(agencyId),
    };
  }

  const accountId = normalizeAdAccountId(adAccountId);
  const insights = await fetchGraphJson(
    `/${accountId}/insights?fields=campaign_id,campaign_name,spend,impressions,actions,cost_per_action_type&level=campaign&date_preset=last_30d`,
    accessToken
  );

  const rows = Array.isArray(insights.data) ? insights.data : [];
  const updates = rows
    .filter((row) => row.campaign_id)
    .map(async (row) => {
      const results = Array.isArray(row.actions) ? sum(row.actions.map((action) => Number(action.value || 0))) : 0;
      const costPerResult = results > 0 ? Number(row.spend || 0) / results : 0;

      return Campaign.findOneAndUpdate(
        { agency: agencyId, facebookCampaignId: row.campaign_id },
        {
          facebookCampaignId: row.campaign_id,
          name: row.campaign_name || "Facebook Campaign",
          performance: {
            spend: Number(row.spend || 0),
            impressions: Number(row.impressions || 0),
            results,
            costPerResult,
            lastSyncedAt: new Date(),
          },
        },
        { new: true }
      );
    });

  await Promise.all(updates);

  credential.lastSyncAt = new Date();
  credential.apiUsage = {
    callsUsed: (credential.apiUsage?.callsUsed || 0) + 1,
    callsLimit: credential.apiUsage?.callsLimit || 200,
    resetAt: credential.apiUsage?.resetAt || null,
  };
  await credential.save();

  return {
    synced: true,
    mode: "graph-api",
    message: `Synced ${rows.length} Facebook campaign insight rows.`,
    overview: await getFacebookOverviewForAgency(agencyId),
  };
}

export async function getFacebookOverviewForAgency(agencyId, clientId = null) {
  const dataScope = clientId ? { agency: agencyId, client: clientId } : { agency: agencyId };
  const [agency, credential, campaigns, invoices] = await Promise.all([
    Agency.findById(agencyId),
    ApiCredential.findOne({ agency: agencyId }).select("+accessToken"),
    Campaign.find(dataScope).sort({ createdAt: -1 }),
    Invoice.find(dataScope).sort({ createdAt: -1 }),
  ]);

  const accessToken = credential?.accessToken?.trim() || "";
  const adAccountId = credential?.defaultAdAccountId?.trim() || "";
  const tokenUsable = Boolean(accessToken && adAccountId && credential?.isConnected && (!credential?.tokenExpiresAt || credential.tokenExpiresAt > new Date()));

  const campaignSpend = sum(campaigns.map((campaign) => campaign.performance?.spend ?? 0));
  const campaignImpressions = sum(campaigns.map((campaign) => campaign.performance?.impressions ?? 0));
  const campaignResults = sum(campaigns.map((campaign) => campaign.performance?.results ?? 0));
  const activeCampaigns = campaigns.filter((campaign) => campaign.status === "active").length;

  const billedAmount = sum(invoices.map((invoice) => invoice.amount ?? 0));
  const unpaidAmount = sum(invoices.filter((invoice) => invoice.status !== "Paid").map((invoice) => invoice.amount ?? 0));
  const dueSoonCount = invoices.filter((invoice) => {
    if (invoice.status === "Paid" || !invoice.dueDate) return false;
    const dueDate = new Date(invoice.dueDate);
    const now = Date.now();
    return dueDate.getTime() >= now && dueDate.getTime() <= now + 7 * 24 * 60 * 60 * 1000;
  }).length;

  const usage = credential?.apiUsage ?? { callsUsed: 0, callsLimit: 200, resetAt: null };
  const currency = agency?.defaultCurrency || "USD";
  const recentCampaigns = formatRecentCampaigns(campaigns);
  const spend = campaignSpend;
  const impressions = campaignImpressions;
  const results = campaignResults;

  return {
    agency: {
      id: agency?._id?.toString?.() || agencyId,
      name: agency?.name || "Agency",
      currency,
    },
    connection: {
      status: tokenUsable ? "connected" : "not-connected",
      isConnected: Boolean(credential?.isConnected),
      adAccountId: adAccountId || "",
      tokenConfigured: Boolean(accessToken),
      lastVerifiedAt: credential?.lastVerifiedAt ?? null,
      lastSyncAt: credential?.lastSyncAt ?? null,
      graphApiReady: tokenUsable,
      graphApi: tokenUsable
        ? {
            baseUrl: GRAPH_API_BASE_URL,
            adAccountId,
            insightsEndpoint: `${GRAPH_API_BASE_URL}/act_${adAccountId.replace(/^act_/, "")}/insights?fields=campaign_name,spend,impressions,clicks,actions&date_preset=last_30d`,
          }
        : null,
    },
    overview: {
      spend,
      impressions,
      results,
      activeCampaigns,
      campaignCount: campaigns.length,
      billedAmount,
      unpaidAmount,
      dueSoonCount,
      usage,
      currency,
      cpa: results > 0 ? spend / results : 0,
    },
    recentCampaigns,
    billing: {
      billedAmount,
      unpaidAmount,
      dueSoonCount,
      currency,
      paidRatio: invoices.length > 0 ? Math.round(((invoices.filter((invoice) => invoice.status === "Paid").length / invoices.length) * 100)) : 0,
    },
    source: tokenUsable ? "facebook-graph-and-stored-data" : "stored-crm-data",
    updatedAt: new Date().toISOString(),
  };
}
