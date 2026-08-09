import { env } from "../config/env.js";
import Agency from "../models/Agency.model.js";
import ApiCredential from "../models/ApiCredential.model.js";
import Campaign from "../models/Campaign.model.js";
import Invoice from "../models/Invoice.model.js";
import Client from "../models/Client.model.js";
import { getClientCampaignVisibility } from "./campaignAssignment.service.js";
import { ApiError } from "../utils/ApiError.js";

const GRAPH_HOST = "graph.facebook.com";
const GRAPH_API_BASE_URL = `https://${GRAPH_HOST}/${env.facebookGraphVersion}`;
const ACCOUNT_FIELDS = "id,account_id,name,account_status,currency,timezone_name,balance,amount_spent,spend_cap";
const CAMPAIGN_FIELDS = "id,name,status,effective_status,objective,daily_budget,lifetime_budget,start_time,stop_time,updated_time";
const INSIGHT_FIELDS = "campaign_id,spend,reach,impressions,actions,ctr";
const ACCOUNT_INSIGHT_FIELDS = "spend";

class GraphApiError extends ApiError {
  constructor(statusCode, message, category = "request") {
    super(statusCode, message);
    this.category = category;
  }
}

function normalizeAdAccountId(value) {
  const raw = String(value || "").replace(/^act_/, "");
  return /^\d+$/.test(raw) ? `act_${raw}` : "";
}
function number(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function sum(values) { return values.reduce((total, value) => total + value, 0); }
function normalizeActions(actions) {
  return Array.isArray(actions) ? actions.filter((item) => item?.action_type).map((item) => ({ actionType: String(item.action_type), value: number(item.value) })) : [];
}
function selectedResultFromActions(actions) {
  const priority = ["offsite_conversion", "lead", "onsite_conversion.lead_grouped", "purchase", "complete_registration", "link_click"];
  if (!Array.isArray(actions)) return { value: 0, metric: "" };
  for (const type of priority) {
    const action = actions.find((item) => item?.action_type === type);
    if (action) return { value: number(action.value), metric: type };
  }
  return { value: 0, metric: "" };
}
function usdRateFor(currency) {
  const sourceCurrency = String(currency || "USD").toUpperCase();
  const rate = env.facebookUsdRates[sourceCurrency];
  if (!Number.isFinite(rate)) throw new GraphApiError(422, `USD conversion rate is not configured for Facebook currency ${sourceCurrency}`, "currency");
  return { sourceCurrency, rate };
}
function convertToUsd(value, currency) { return number(value) * usdRateFor(currency).rate; }
function safeGraphError(status, payload) {
  const graphCode = Number(payload?.error?.code);
  if (graphCode === 190 || status === 401) return new GraphApiError(502, "Facebook access token is invalid or expired", "invalid-token");
  if (status === 429 || [4, 17, 32, 613].includes(graphCode)) return new GraphApiError(502, "Facebook Graph API rate limit reached; please try again later", "rate-limit");
  if (status === 403) return new GraphApiError(502, "Facebook access is insufficient", "permission");
  if (status >= 500) return new GraphApiError(502, "Facebook Graph API is temporarily unavailable", "temporary");
  return new GraphApiError(502, "Facebook Graph API request failed");
}
async function graphRequest(input, accessToken, method = "GET") {
  const url = new URL(input.startsWith("http") ? input : `${GRAPH_API_BASE_URL}/${input.replace(/^\//, "")}`);
  if (url.protocol !== "https:" || url.hostname !== GRAPH_HOST) {
    throw new GraphApiError(502, "Invalid Facebook pagination URL");
  }
  let response;
  try {
    response = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      signal: AbortSignal.timeout(env.facebookRequestTimeoutMs),
    });
  } catch (error) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") throw new GraphApiError(504, "Facebook Graph API request timed out", "timeout");
    throw new GraphApiError(502, "Facebook Graph API is unavailable", "temporary");
  }
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : {}; } catch { throw new GraphApiError(502, "Facebook Graph API returned an invalid response"); }
  if (!response.ok || payload?.error) {
    throw safeGraphError(response.status, payload);
  }
  return payload;
}
async function fetchAll(path, accessToken) {
  const rows = [];
  let next = path;
  for (let page = 0; next && page < env.facebookSyncMaxPages; page += 1) {
    const payload = await graphRequest(next, accessToken);
    if (Array.isArray(payload.data)) rows.push(...payload.data);
    next = payload.paging?.next || null;
  }
  if (next) throw new GraphApiError(502, "Facebook pagination limit reached");
  return rows;
}

export async function fetchFacebookCampaignInsights({ facebookAdAccountId, accessToken, since, until, currency }) {
  const sourceCurrency = String(currency || "").trim().toUpperCase();
  if (!sourceCurrency) throw new GraphApiError(422, `Facebook currency is unavailable for ad account ${facebookAdAccountId}`, "currency");
  const usdRate = usdRateFor(sourceCurrency).rate;
  const params = new URLSearchParams({
    fields: INSIGHT_FIELDS,
    level: "campaign",
    time_range: JSON.stringify({ since, until }),
  });
  const rows = await fetchAll(`/${facebookAdAccountId}/insights?${params.toString()}`, accessToken);
  return rows.filter((row) => row?.campaign_id).map((row) => {
    const selectedResult = selectedResultFromActions(row.actions);
    const spend = number(row.spend) * usdRate;
    return {
      facebookCampaignId: String(row.campaign_id),
      actions: normalizeActions(row.actions),
      results: selectedResult.value,
      resultMetric: selectedResult.metric,
      landingPageViews: number(row.actions?.find((action) => action?.action_type === "landing_page_view")?.value),
      spend,
      amountSpent: spend,
      costPerResult: selectedResult.value ? spend / selectedResult.value : 0,
      ctrAll: number(row.ctr),
      reach: number(row.reach),
      impressions: number(row.impressions),
      currency: "USD",
    };
  });
}
function accountDto(account) {
  return {
    facebookAdAccountId: normalizeAdAccountId(account.facebookAdAccountId || account.id),
    accountId: String(account.accountId || account.account_id || ""),
    name: account.name || "",
    accountStatus: account.accountStatus ?? account.account_status ?? null,
    currency: account.currency || "",
    timezoneName: account.timezoneName || account.timezone_name || "",
    balance: account.balance == null ? null : number(account.balance),
    amountSpent: account.amountSpent == null && account.amount_spent == null ? null : number(account.amountSpent ?? account.amount_spent),
    spendCap: account.spendCap == null && account.spend_cap == null ? null : number(account.spendCap ?? account.spend_cap),
    lastSeenAt: account.lastSeenAt || new Date(),
    isAccessible: account.isAccessible !== false,
  };
}
function formatRecentCampaigns(campaigns) {
  return campaigns.filter((campaign) => campaign.source === "facebook" && campaign.performance?.usdConversionAvailable).slice(0, 3).map((campaign) => ({ id: campaign._id, name: campaign.name, status: campaign.status, spend: campaign.performance?.amountSpent ?? campaign.performance?.spend ?? 0, impressions: campaign.performance?.impressions ?? 0, results: campaign.performance?.results ?? 0, costPerResult: campaign.performance?.costPerResult ?? 0 }));
}
function campaignStatus(effectiveStatus) {
  return effectiveStatus === "ACTIVE" ? "active" : effectiveStatus === "PAUSED" ? "paused" : "draft";
}
function budgetFromCampaign(row, currency) {
  if (row.daily_budget !== undefined && row.daily_budget !== null) return { amount: number(row.daily_budget) / 100, type: "daily", currency };
  if (row.lifetime_budget !== undefined && row.lifetime_budget !== null) return { amount: number(row.lifetime_budget) / 100, type: "lifetime", currency };
  return { amount: null, type: null, currency };
}

export async function fetchFacebookAccountReport({ agencyId, since, until, clientId = null }) {
  const credential = await ApiCredential.findOne({ agency: agencyId }).select("+accessToken adAccounts isConnected tokenExpiresAt");
  const token = credential?.accessToken?.trim() || "";
  if (!credential || !credential.isConnected || !token) throw new ApiError(409, "Facebook is not connected for this agency");
  if (credential.tokenExpiresAt && credential.tokenExpiresAt <= new Date()) throw new ApiError(409, "Facebook access token has expired; reconnect Facebook");
  const accounts = clientId ? await getFacebookAccountsForAgency(agencyId, clientId) : (credential.adAccounts || []).map(accountDto);
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const yesterdayDate = new Date(now);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterday = yesterdayDate.toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 8)}01`;
  const readSpend = async (account, range) => {
    const params = new URLSearchParams({ fields: ACCOUNT_INSIGHT_FIELDS, time_range: JSON.stringify(range) });
    const rows = await fetchAll(`/${account.facebookAdAccountId}/insights?${params.toString()}`, token);
    return sum(rows.map((row) => number(row.spend)));
  };
  return Promise.all(accounts.filter((account) => account.isAccessible !== false).map(async (account) => {
    const currency = String(account.currency || "").toUpperCase();
    try {
      const rate = usdRateFor(currency).rate;
      const [todaySpend, yesterdaySpend, mtdSpend, selectedSpend] = await Promise.all([
        readSpend(account, { since: today, until: today }),
        readSpend(account, { since: yesterday, until: yesterday }),
        readSpend(account, { since: monthStart, until: today }),
        readSpend(account, { since, until }),
      ]);
      return { ...account, balance: account.balance == null ? null : account.balance / 100 * rate, amountSpent: account.amountSpent == null ? null : account.amountSpent / 100 * rate, spendCap: account.spendCap == null ? null : account.spendCap / 100 * rate, todaySpend: todaySpend * rate, yesterdaySpend: yesterdaySpend * rate, mtdSpend: mtdSpend * rate, selectedSpend: selectedSpend * rate, sourceCurrency: currency, currency: "USD", billingLink: `https://business.facebook.com/billing_hub/payment_methods?asset_id=${encodeURIComponent(account.accountId)}`, campaignLink: `https://www.facebook.com/adsmanager/manage/campaigns?act=${encodeURIComponent(account.accountId)}`, error: null };
    } catch (error) {
      return { ...account, sourceCurrency: currency, currency: "USD", billingLink: `https://business.facebook.com/billing_hub/payment_methods?asset_id=${encodeURIComponent(account.accountId)}`, campaignLink: `https://www.facebook.com/adsmanager/manage/campaigns?act=${encodeURIComponent(account.accountId)}`, error: { message: error instanceof ApiError ? error.message : "Facebook account report failed", category: error.category || "request" } };
    }
  }));
}

export async function discoverFacebookAdAccounts(accessToken) {
  const discovered = await fetchAll(`/me/adaccounts?fields=${ACCOUNT_FIELDS}`, accessToken);
  const now = new Date();
  return discovered.map((account) => accountDto({ ...account, lastSeenAt: now })).filter((account) => account.facebookAdAccountId);
}

export async function syncFacebookAccount(agencyId, account, accessToken) {
  try {
    return await syncAccount(agencyId, account, accessToken);
  } catch (error) {
    return {
      account: account.facebookAdAccountId,
      accountName: account.name,
      campaignCount: null,
      insightCount: null,
      matchedCount: 0,
      modifiedCount: 0,
      upsertedCount: 0,
      staleCount: 0,
      status: "failed",
      error: { message: error instanceof ApiError ? error.message : "Facebook account sync failed", category: error.category || "request", retryable: ["temporary", "timeout", "rate-limit"].includes(error.category) },
    };
  }
}

async function syncAccount(agencyId, account, accessToken) {
  const accountId = account.facebookAdAccountId;
  const [campaigns, insights] = await Promise.all([
    fetchAll(`/${accountId}/campaigns?fields=${CAMPAIGN_FIELDS}`, accessToken),
    fetchAll(`/${accountId}/insights?fields=${INSIGHT_FIELDS}&level=campaign&date_preset=last_30d`, accessToken),
  ]);
  const insightMap = new Map(insights.filter((row) => row.campaign_id).map((row) => [String(row.campaign_id), row]));
  const seenIds = [];
  const now = new Date();
  const operations = [];
  for (const row of campaigns) {
    if (!row?.id) continue;
    const id = String(row.id);
    seenIds.push(id);
    const insight = insightMap.get(id) || {};
    const selectedResult = selectedResultFromActions(insight.actions);
    const actions = normalizeActions(insight.actions);
    const sourceCurrency = String(account.currency || "USD").toUpperCase();
    const usdRate = usdRateFor(sourceCurrency).rate;
    const spend = number(insight.spend) * usdRate;
    operations.push({
      updateOne: {
        filter: { agency: agencyId, source: "facebook", facebookAdAccountId: accountId, facebookCampaignId: id },
        update: {
          $set: {
            facebookAdAccountName: account.name,
            name: row.name || "Facebook Campaign",
            facebookObjective: row.objective || "",
            facebookStatus: row.status || "",
            effectiveStatus: row.effective_status || "",
            status: campaignStatus(row.effective_status || row.status),
            lastSeenAt: now,
            isStale: false,
            startDate: row.start_time || null,
            endDate: row.stop_time || null,
            budget: { ...budgetFromCampaign(row, "USD"), amount: budgetFromCampaign(row, account.currency || "USD").amount == null ? null : convertToUsd(budgetFromCampaign(row, account.currency || "USD").amount, account.currency || "USD") },
            performance: { spend, amountSpent: spend, reach: number(insight.reach), impressions: number(insight.impressions), results: selectedResult.value, resultMetric: selectedResult.metric, actions, ctrAll: number(insight.ctr), costPerResult: selectedResult.value ? spend / selectedResult.value : 0, currency: "USD", delivery: row.effective_status || row.status || "", sourceCurrency, usdConversionAvailable: true, lastSyncedAt: now },
          },
          $setOnInsert: { agency: agencyId, source: "facebook", facebookCampaignId: id, facebookAdAccountId: accountId, platform: "facebook", objective: row.objective || "" },
        },
        upsert: true,
      },
    });
  }
  let writeResult = { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
  if (operations.length) writeResult = await Campaign.bulkWrite(operations, { ordered: false });
  const staleResult = await Campaign.updateMany({ agency: agencyId, source: "facebook", facebookAdAccountId: accountId, facebookCampaignId: { $nin: seenIds }, isStale: { $ne: true } }, { $set: { isStale: true } });
  return {
    account: accountId,
    accountName: account.name,
    campaignCount: seenIds.length,
    insightCount: insights.length,
    matchedCount: writeResult.matchedCount || 0,
    modifiedCount: writeResult.modifiedCount || 0,
    upsertedCount: writeResult.upsertedCount || 0,
    staleCount: staleResult.modifiedCount || 0,
    status: "success",
  };
}

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

export async function syncFacebookInsightsForAgency(agencyId) {
  const credential = await ApiCredential.findOne({ agency: agencyId }).select("+accessToken");
  const token = credential?.accessToken?.trim() || "";
  if (!credential || !token || !credential.isConnected || (credential.tokenExpiresAt && credential.tokenExpiresAt <= new Date())) return { synced: false, mode: "not-connected", message: "Connect Facebook before syncing all ad accounts.", overview: await getFacebookOverviewForAgency(agencyId), accounts: [] };
  let discovered;
  try {
    discovered = await discoverFacebookAdAccounts(token);
  } catch (error) {
    credential.lastSyncStatus = "failed";
    await credential.save();
    throw error;
  }
  const now = new Date();
  const discoveredIds = new Set(discovered.map((account) => account.facebookAdAccountId));
  const inaccessible = (credential.adAccounts || []).map(accountDto).filter((account) => !discoveredIds.has(account.facebookAdAccountId)).map((account) => ({ ...account, isAccessible: false }));
  credential.adAccounts = [...discovered, ...inaccessible];
  credential.lastAccountSyncAt = now;
  credential.lastVerifiedAt = now;
  const results = await mapWithConcurrency(discovered, env.facebookSyncConcurrency, (account) => syncFacebookAccount(agencyId, account, token));
  credential.lastSyncAt = now;
  credential.lastSyncStatus = results.length > 0 && results.every((item) => item.status === "success") ? "success" : results.some((item) => item.status === "success") ? "partial" : "failed";
  credential.apiUsage = { ...credential.apiUsage?.toObject?.(), callsUsed: (credential.apiUsage?.callsUsed || 0) + 1, callsLimit: credential.apiUsage?.callsLimit || 200, resetAt: credential.apiUsage?.resetAt || null };
  await credential.save();
  return { synced: results.some((item) => item.status === "success"), mode: "graph-api", message: `Synced ${results.filter((item) => item.status === "success").length}/${results.length} Facebook ad accounts.`, accounts: results, overview: await getFacebookOverviewForAgency(agencyId) };
}

export async function getFacebookAccountsForAgency(agencyId, clientId = null) {
  const credential = await ApiCredential.findOne({ agency: agencyId });
  if (!clientId) return (credential?.adAccounts || []).map(accountDto);

  const client = await Client.findOne({ _id: clientId, agency: agencyId }).select("facebookAdAccountIds");
  const assignedIds = new Set(client?.facebookAdAccountIds || []);
  const individuallyAssigned = await Campaign.find({ agency: agencyId, client: clientId, source: "facebook" })
    .select("facebookAdAccountId facebookAdAccountName");
  const visibleIds = new Set([
    ...assignedIds,
    ...individuallyAssigned.map((campaign) => campaign.facebookAdAccountId).filter(Boolean),
  ]);
  const snapshots = new Map((credential?.adAccounts || []).map((account) => {
    const dto = accountDto(account);
    return [dto.facebookAdAccountId, dto];
  }));
  for (const campaign of individuallyAssigned) {
    if (campaign.facebookAdAccountId && !snapshots.has(campaign.facebookAdAccountId)) {
      snapshots.set(campaign.facebookAdAccountId, {
        facebookAdAccountId: campaign.facebookAdAccountId,
        accountId: campaign.facebookAdAccountId.replace(/^act_/, ""),
        name: campaign.facebookAdAccountName || "",
        isAccessible: false,
      });
    }
  }
  return [...visibleIds].map((id) => snapshots.get(id)).filter(Boolean);
}

export async function disconnectFacebookForAgency(agencyId, revokeRemote = false) {
  const credential = await ApiCredential.findOne({ agency: agencyId }).select("+accessToken");
  if (!credential) return { disconnected: true, remoteRevoked: false };
  let remoteRevoked = false;
  if (revokeRemote && credential.accessToken) {
    try {
      await graphRequest("/me/permissions", credential.accessToken, "DELETE");
      remoteRevoked = true;
    } catch (error) {
      if (error?.category !== "invalid-token") throw error;
      remoteRevoked = true;
    }
  }
  credential.accessToken = "";
  credential.isConnected = false;
  credential.defaultAdAccountId = "";
  credential.tokenExpiresAt = null;
  credential.lastVerifiedAt = null;
  await credential.save();
  return { disconnected: true, remoteRevoked };
}

export async function getFacebookOverviewForAgency(agencyId, clientId = null) {
  const campaignScope = clientId ? await getClientCampaignVisibility(agencyId, clientId) : { agency: agencyId };
  const invoiceScope = clientId ? { agency: agencyId, client: clientId } : { agency: agencyId };
  const [agency, credential, campaigns, invoices] = await Promise.all([Agency.findById(agencyId), ApiCredential.findOne({ agency: agencyId }).select("+accessToken"), Campaign.find(campaignScope).sort({ createdAt: -1 }), Invoice.find(invoiceScope).sort({ createdAt: -1 })]);
  const facebookCampaigns = campaigns.filter((campaign) => campaign.source === "facebook");
  const convertedFacebookCampaigns = facebookCampaigns.filter((campaign) => campaign.performance?.usdConversionAvailable);
  const spend = sum(convertedFacebookCampaigns.map((campaign) => campaign.performance?.amountSpent ?? campaign.performance?.spend ?? 0)); const impressions = sum(facebookCampaigns.map((campaign) => campaign.performance?.impressions ?? 0)); const results = sum(convertedFacebookCampaigns.map((campaign) => campaign.performance?.results ?? 0)); const billedAmount = sum(invoices.map((invoice) => invoice.amount ?? 0)); const unpaidAmount = sum(invoices.filter((invoice) => invoice.status !== "Paid").map((invoice) => invoice.amount ?? 0));
  const scopedAccounts = clientId ? await getFacebookAccountsForAgency(agencyId, clientId) : (credential?.adAccounts || []).map(accountDto);
  return { agency: { id: agency?._id?.toString?.() || agencyId, name: agency?.name || "Agency", currency: agency?.defaultCurrency || "USD" }, connection: { status: credential?.isConnected && credential.accessToken ? "connected" : "not-connected", isConnected: Boolean(credential?.isConnected && credential?.accessToken), adAccountId: credential?.defaultAdAccountId || "", accountCount: scopedAccounts.length, accounts: scopedAccounts, tokenConfigured: Boolean(credential?.accessToken), lastVerifiedAt: credential?.lastVerifiedAt || null, lastSyncAt: credential?.lastSyncAt || null, lastAccountSyncAt: credential?.lastAccountSyncAt || null, lastSyncStatus: credential?.lastSyncStatus || "never", graphApiReady: Boolean(credential?.isConnected && credential?.accessToken), graphApi: null }, overview: { spend, impressions, results, activeCampaigns: campaigns.filter((campaign) => campaign.status === "active").length, campaignCount: campaigns.length, billedAmount, unpaidAmount, dueSoonCount: 0, usage: credential?.apiUsage || { callsUsed: 0, callsLimit: 200, resetAt: null }, currency: "USD", cpa: results ? spend / results : 0 }, recentCampaigns: formatRecentCampaigns(campaigns), billing: { billedAmount, unpaidAmount, dueSoonCount: 0, currency: agency?.defaultCurrency || "USD", paidRatio: 0 }, source: credential?.isConnected ? "facebook-graph-and-stored-data" : "stored-crm-data", updatedAt: new Date().toISOString() };
}
