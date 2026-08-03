import { createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import ActivityLog from "../models/ActivityLog.model.js";
import ApiCredential from "../models/ApiCredential.model.js";
import FacebookAdAccountCache from "../models/FacebookAdAccountCache.model.js";
import FacebookAdAccountMutation from "../models/FacebookAdAccountMutation.model.js";
import { ApiError } from "../utils/ApiError.js";
import { decryptFacebookToken } from "../utils/facebookTokenCrypto.js";
import { GraphApiError, graphFetchAll, graphRequest } from "./facebookGraph.service.js";

const EXPONENTS = new Map(["BDT", "USD", "EUR", "GBP", "INR", "AED", "CAD", "AUD", "SGD"].map((currency) => [currency, 2]));
const BASE_ACCOUNT_FIELDS = "id,account_id,name,currency,balance,amount_spent,spend_cap,disable_reason,account_status,timezone_name";
const ACCOUNT_FIELDS = `${BASE_ACCOUNT_FIELDS},funding_source_details`;
const ADSET_FIELDS = "id,name,campaign_id,optimization_goal,effective_status,daily_budget,lifetime_budget,campaign{id,name,effective_status,daily_budget,lifetime_budget}";
const STATUS = { 1: "ACTIVE", 2: "DISABLED", 3: "UNSETTLED", 7: "PENDING_RISK_REVIEW", 8: "PENDING_SETTLEMENT", 9: "IN_GRACE_PERIOD", 100: "PENDING_CLOSURE", 101: "CLOSED", 201: "ANY_ACTIVE", 202: "ANY_CLOSED" };
const DISABLE = { 0: "NONE", 1: "ADS_INTEGRITY_POLICY", 2: "ADS_IP_REVIEW", 3: "RISK_PAYMENT", 4: "GRAY_ACCOUNT_SHUT_DOWN", 5: "ADS_AFC_REVIEW", 6: "BUSINESS_INTEGRITY_RAR", 7: "PERMANENT_CLOSE", 8: "UNUSED_RESELLER_ACCOUNT", 9: "UNUSED_ACCOUNT", 10: "UMBRELLA_AD_ACCOUNT", 11: "BUSINESS_MANAGER_INTEGRITY_POLICY", 12: "MISREPRESENTED_AD_ACCOUNT", 13: "AOAB_DESHARE_LEGAL_ENTITY", 14: "CTX_THREAD_REVIEW", 15: "COMPROMISED_AD_ACCOUNT" };
const RETRYABLE = new Set(["temporary", "timeout", "rate-limit"]);

export function normalizeAccountId(value) {
  const raw = String(value || "").replace(/^act_/, "");
  if (!/^\d+$/.test(raw)) throw new ApiError(400, "Invalid ad account ID");
  return `act_${raw}`;
}
function exponent(currency) { return EXPONENTS.get(String(currency || "").toUpperCase()); }
function minor(value) {
  const raw = String(value ?? "0");
  if (!/^\d+$/.test(raw)) throw new ApiError(502, "Facebook returned an invalid money value");
  return BigInt(raw);
}
export function parseMajorMoney(value, exp = 2) {
  const raw = String(value || "").trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(raw)) throw new ApiError(400, "Amount must be a positive decimal string with at most 2 decimal places");
  const [whole, fraction = ""] = raw.split(".");
  const result = BigInt(whole) * (10n ** BigInt(exp)) + BigInt(fraction.padEnd(exp, "0"));
  if (result <= 0n) throw new ApiError(400, "Amount must be greater than zero");
  return result;
}
function majorString(value, exp = 2) {
  const amount = typeof value === "bigint" ? value : minor(value);
  const scale = 10n ** BigInt(exp);
  return `${amount / scale}.${String(amount % scale).padStart(exp, "0")}`;
}
function money(value, currency) {
  if (value === null || value === undefined || value === "") return { minor: null, amount: null, currency, exponent: exponent(currency) ?? null };
  const exp = exponent(currency);
  const rawMinor = minor(value);
  return { minor: rawMinor.toString(), amount: exp === undefined ? rawMinor.toString() : majorString(rawMinor, exp), currency, exponent: exp ?? null };
}
function decimalSum(values) {
  const cents = values.reduce((sum, value) => sum + BigInt(Math.round(Number(value || 0) * 100)), 0n);
  return majorString(cents);
}
function accountToday(timezone, now = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone || "UTC", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
    const get = (type) => parts.find((part) => part.type === type)?.value;
    return `${get("year")}-${get("month")}-${get("day")}`;
  } catch { return now.toISOString().slice(0, 10); }
}
function monthStart(date) { return `${date.slice(0, 7)}-01`; }
function previousDate(date) { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); }
function validDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value; }
function statusMap(code, mapping) { return { code: code ?? null, label: mapping[Number(code)] || "UNKNOWN" }; }
function cleanGoal(value) { return typeof value === "string" && /^[A-Z0-9_]{1,80}$/.test(value) ? value : "UNKNOWN"; }
function safeText(value, max = 80) { return typeof value === "string" && value.length <= max && !/[\r\n]/.test(value) ? value : null; }
function fundingCapability(details, fallbackStatus = null) {
  if (fallbackStatus) return { status: fallbackStatus, reason: fallbackStatus === "permission_required" ? "Meta permission does not allow funding details" : "Funding details are unsupported for this account", displayType: null, last4: null, fundingStatus: null, threshold: null };
  if (!details || typeof details !== "object") return { status: "unavailable", reason: "Funding details were not returned by Meta", displayType: null, last4: null, fundingStatus: null, threshold: null };
  const displayType = safeText(details.type || details.funding_source_type, 40);
  const last4Value = String(details.last4 || details.last_four_digits || "");
  const last4 = /^\d{4}$/.test(last4Value) ? last4Value : null;
  const fundingStatus = safeText(details.status, 40);
  const thresholdValue = details.threshold ?? details.billing_threshold;
  const threshold = /^\d+$/.test(String(thresholdValue ?? "")) ? String(thresholdValue) : null;
  const available = displayType || last4 || fundingStatus || threshold;
  return { status: available ? "available" : "unavailable", reason: available ? null : "Meta did not provide displayable funding metadata", displayType, last4, fundingStatus, threshold };
}
async function credentialFor(agencyId) {
  const credential = await ApiCredential.findOne({ agency: agencyId }).select("+accessToken credentialGeneration adAccounts isConnected tokenExpiresAt");
  const token = decryptFacebookToken(credential?.accessToken || "").trim();
  if (!credential?.isConnected || !token || (credential.tokenExpiresAt && credential.tokenExpiresAt <= new Date())) throw new ApiError(409, "Connect Facebook before loading ad accounts");
  return { credential, token };
}
function accessible(credential, accountId) {
  const item = (credential.adAccounts || []).find((row) => row.facebookAdAccountId === accountId && row.isAccessible !== false);
  if (!item) throw new ApiError(404, "Ad account is not in the current accessible credential snapshot");
  return item;
}
export async function listAccounts(agencyId) {
  const { credential } = await credentialFor(agencyId);
  const rows = (credential.adAccounts || []).filter((row) => row.isAccessible !== false);
  const cached = await FacebookAdAccountCache.find({ agency: agencyId, accountId: { $in: rows.map((row) => row.facebookAdAccountId) } }).sort({ fetchedAt: -1 }).lean();
  const summaries = new Map();
  for (const item of cached) if (!summaries.has(item.accountId)) summaries.set(item.accountId, { balance: item.payload?.account?.balance, lifetimeSpend: item.payload?.account?.lifetimeSpend, spendCap: item.payload?.account?.spendCap, fetchedAt: item.fetchedAt });
  return rows.map((row) => ({ accountId: row.facebookAdAccountId, numericAccountId: row.accountId, name: row.name, currency: row.currency, status: statusMap(row.accountStatus, STATUS), timezoneName: row.timezoneName, isAccessible: true, cachedSummary: summaries.get(row.facebookAdAccountId) || null }));
}
async function fetchAccount(accountId, token) {
  try { return { account: await graphRequest(`/${accountId}`, token, { params: { fields: ACCOUNT_FIELDS } }), fundingFallback: null }; }
  catch (error) {
    if (!(error instanceof GraphApiError)) throw error;
    const account = await graphRequest(`/${accountId}`, token, { params: { fields: BASE_ACCOUNT_FIELDS } });
    return { account, fundingFallback: error.category === "permission" ? "permission_required" : "unsupported" };
  }
}
export function aggregateActiveBudgets(adsets, currency) {
  const campaigns = new Map();
  const abo = new Map();
  let lifetimeExcludedCount = 0;
  for (const row of adsets) {
    if (row.effective_status !== "ACTIVE") continue;
    if (row.lifetime_budget) lifetimeExcludedCount += 1;
    const campaign = row.campaign;
    if (campaign?.effective_status === "ACTIVE" && campaign.daily_budget) {
      const id = String(campaign.id || row.campaign_id);
      const entry = campaigns.get(id) || { amount: minor(campaign.daily_budget), goals: new Set() };
      entry.goals.add(cleanGoal(row.optimization_goal));
      campaigns.set(id, entry);
    } else if (row.daily_budget) {
      const goal = cleanGoal(row.optimization_goal);
      abo.set(goal, (abo.get(goal) || 0n) + minor(row.daily_budget));
    }
    if (campaign?.lifetime_budget) lifetimeExcludedCount += 1;
  }
  const output = new Map([...abo].map(([goal, amount]) => [goal, { amount, sources: new Set(["ABO"]) }]));
  for (const campaign of campaigns.values()) {
    const goal = campaign.goals.size === 1 ? [...campaign.goals][0] : "MIXED_CBO";
    const entry = output.get(goal) || { amount: 0n, sources: new Set() };
    entry.amount += campaign.amount; entry.sources.add("CBO"); output.set(goal, entry);
  }
  return { rows: [...output].map(([goal, entry]) => ({ goal, ...money(entry.amount, currency), source: entry.sources.size > 1 ? "mixed" : [...entry.sources][0] })), lifetimeExcludedCount };
}
async function buildDetail(accountId, selectedDate, token) {
  const { account, fundingFallback } = await fetchAccount(accountId, token);
  const currency = String(account.currency || "").toUpperCase();
  const today = accountToday(account.timezone_name);
  if (selectedDate < "2020-01-01" || selectedDate > today) throw new ApiError(400, "Date must be between 2020-01-01 and today in the ad account timezone");
  const [daily, adsets, selectedInsights] = await Promise.all([
    graphFetchAll(`/${accountId}/insights`, token, { fields: "spend,date_start,date_stop", level: "account", time_range: JSON.stringify({ since: monthStart(today), until: today }), time_increment: 1 }),
    graphFetchAll(`/${accountId}/adsets`, token, { fields: ADSET_FIELDS, limit: 500 }),
    graphFetchAll(`/${accountId}/insights`, token, { fields: "spend,adset_id,adset_name", level: "adset", time_range: JSON.stringify({ since: selectedDate, until: selectedDate }) }),
  ]);
  const adsetMap = new Map(adsets.map((row) => [String(row.id), row]));
  const optimization = new Map();
  for (const row of selectedInsights) {
    const goal = cleanGoal(adsetMap.get(String(row.adset_id))?.optimization_goal);
    optimization.set(goal, [...(optimization.get(goal) || []), row.spend]);
  }
  const budgets = aggregateActiveBudgets(adsets, currency);
  const byDate = new Map(daily.map((row) => [row.date_start, String(row.spend || "0")]));
  const numericId = String(account.account_id || accountId.replace(/^act_/, ""));
  return {
    account: { accountId, numericAccountId: numericId, name: account.name || "", currency, timezoneName: account.timezone_name || "UTC", status: statusMap(account.account_status, STATUS), disableReason: statusMap(account.disable_reason, DISABLE), balance: money(account.balance, currency), lifetimeSpend: money(account.amount_spent, currency), spendCap: money(account.spend_cap, currency) },
    periods: { today: { date: today, amount: Number(byDate.get(today) || 0).toFixed(2) }, yesterday: { date: previousDate(today), amount: Number(byDate.get(previousDate(today)) || 0).toFixed(2) }, mtd: { from: monthStart(today), to: today, amount: decimalSum(daily.map((row) => row.spend)) }, currency },
    selectedDate,
    optimizationSpend: [...optimization].map(([goal, values]) => ({ goal, amount: decimalSum(values), currency })),
    activeBudget: budgets.rows,
    budgetExclusions: { lifetimeBudgetCount: budgets.lifetimeExcludedCount },
    capabilities: { funding: fundingCapability(account.funding_source_details, fundingFallback), billing: { status: "unsupported", reason: "Meta does not expose billing history through this endpoint" }, spendCapWrite: { status: exponent(currency) === undefined ? "unsupported" : "available", reason: exponent(currency) === undefined ? "Currency exponent is not supported for safe writes" : null } },
    links: { billing: `https://business.facebook.com/billing_hub/accounts/details/?asset_id=${numericId}`, campaigns: `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${numericId}` },
    partialErrors: fundingFallback ? [{ category: "funding", message: fundingFallback === "permission_required" ? "Funding details require additional Meta permission." : "Funding details are not supported for this account." }] : [], stale: false, fetchedAt: new Date().toISOString(),
  };
}
export async function getAccountDetail(agencyId, rawAccountId, date, refresh = false) {
  const accountId = normalizeAccountId(rawAccountId);
  const { credential, token } = await credentialFor(agencyId);
  const snapshot = accessible(credential, accountId);
  const selectedDate = date || accountToday(snapshot?.timezoneName);
  if (!validDate(selectedDate)) throw new ApiError(400, "Date must use YYYY-MM-DD");
  const cached = await FacebookAdAccountCache.findOne({ agency: agencyId, accountId, date: selectedDate });
  if (!refresh && cached?.expiresAt > new Date()) return cached.payload;
  try {
    const payload = await buildDetail(accountId, selectedDate, token);
    const fetchedAt = new Date();
    await FacebookAdAccountCache.findOneAndUpdate({ agency: agencyId, accountId, date: selectedDate }, { $set: { payload, fetchedAt, expiresAt: new Date(fetchedAt.getTime() + env.facebookAdAccountCacheTtlMs), purgeAt: new Date(fetchedAt.getTime() + env.facebookAdAccountStaleMaxMs) } }, { upsert: true, runValidators: true });
    return payload;
  } catch (error) {
    if (cached && RETRYABLE.has(error.category) && Date.now() - cached.fetchedAt.getTime() <= env.facebookAdAccountStaleMaxMs) return { ...cached.payload, stale: true, partialErrors: [...(cached.payload.partialErrors || []), { category: error.category, message: error.message }], fetchedAt: cached.fetchedAt.toISOString() };
    throw error;
  }
}
async function freshCap(accountId, token) {
  const row = await graphRequest(`/${accountId}`, token, { params: { fields: "account_id,currency,spend_cap" } });
  return { currency: String(row.currency || "").toUpperCase(), current: minor(row.spend_cap) };
}
function mutationTarget(operation, amount, current) {
  const target = operation === "set" ? amount : operation === "add" ? current + amount : current - amount;
  if (target <= 0n) throw new ApiError(400, "Target spending limit must be greater than zero");
  return target;
}
function validateOperation(operation) { if (!["set", "add", "reduce"].includes(operation)) throw new ApiError(400, "Operation must be set, add, or reduce"); }
export async function previewSpendCap(agencyId, rawAccountId, actorId, body) {
  const accountId = normalizeAccountId(rawAccountId); validateOperation(body.operation);
  const { credential, token } = await credentialFor(agencyId); accessible(credential, accountId);
  const { currency, current } = await freshCap(accountId, token);
  const exp = exponent(currency); if (exp === undefined) throw new ApiError(400, "Spend-cap writes are not supported for this currency");
  const amount = parseMajorMoney(body.amount, exp); const target = mutationTarget(body.operation, amount, current);
  const maximum = parseMajorMoney(env.facebookSpendCapMaxMajor, exp);
  if (target > maximum) throw new ApiError(400, "Target spending limit exceeds the configured maximum");
  const binding = { agencyId: String(agencyId), accountId, actorId: String(actorId), credentialGeneration: credential.credentialGeneration, operation: body.operation, amountMinor: amount.toString(), currentMinor: current.toString(), targetMinor: target.toString(), currency };
  const confirmationToken = jwt.sign(binding, env.jwtSecret, { expiresIn: Math.ceil(env.facebookSpendCapConfirmationTtlMs / 1000), audience: "facebook-spend-cap", issuer: "adflow:spend-cap" });
  return { operation: body.operation, currency, current: majorString(current, exp), amount: majorString(amount, exp), change: `${body.operation === "reduce" ? "-" : body.operation === "add" ? "+" : "="}${majorString(amount, exp)}`, target: majorString(target, exp), accountId, confirmationToken };
}
function verifyConfirmation(token) {
  try { return jwt.verify(token, env.jwtSecret, { audience: "facebook-spend-cap", issuer: "adflow:spend-cap" }); }
  catch { throw new ApiError(400, "Confirmation token is invalid or expired"); }
}
function hashRequest(value) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
export async function applySpendCap(agencyId, rawAccountId, actorId, idempotencyKey, body) {
  const accountId = normalizeAccountId(rawAccountId); validateOperation(body.operation);
  const binding = verifyConfirmation(body.confirmationToken);
  if (binding.agencyId !== String(agencyId) || binding.accountId !== accountId || binding.actorId !== String(actorId) || binding.operation !== body.operation) throw new ApiError(409, "Confirmation does not match this request");
  const { credential, token } = await credentialFor(agencyId); accessible(credential, accountId);
  if (credential.credentialGeneration !== binding.credentialGeneration) throw new ApiError(409, "Facebook credential changed after preview");
  const exp = exponent(binding.currency); if (exp === undefined) throw new ApiError(400, "Spend-cap writes are not supported for this currency");
  const amount = parseMajorMoney(body.amount, exp);
  if (amount.toString() !== binding.amountMinor) throw new ApiError(409, "Amount changed after preview");
  const requestHash = hashRequest({ accountId, operation: body.operation, amountMinor: binding.amountMinor, targetMinor: binding.targetMinor });
  let receipt;
  try {
    receipt = await FacebookAdAccountMutation.create({ agency: agencyId, credential: credential._id, actor: actorId, accountId, idempotencyKey, requestHash, operation: body.operation, amountMinor: binding.amountMinor, oldMinor: binding.currentMinor, targetMinor: binding.targetMinor, currency: binding.currency, expiresAt: new Date(Date.now() + env.facebookAdAccountMutationRetentionMs) });
  } catch {
    const prior = await FacebookAdAccountMutation.findOne({ agency: agencyId, idempotencyKey });
    if (!prior) throw new ApiError(409, "Another spend-cap operation is active for this account");
    if (prior.requestHash !== requestHash) throw new ApiError(409, "Idempotency key was already used for a different request");
    if (prior.status === "succeeded") return prior.result;
    throw new ApiError(409, prior.status === "pending" ? "This operation is already pending" : `Previous operation status is ${prior.status}`);
  }
  let finalized = false;
  const finish = async (status, update = {}) => { finalized = true; await FacebookAdAccountMutation.updateOne({ _id: receipt._id }, { $set: { status, lockActive: false, completedAt: new Date(), ...update } }); };
  try {
    const before = await freshCap(accountId, token);
    if (before.currency !== binding.currency || before.current.toString() !== binding.currentMinor) { await finish("failed", { errorCategory: "stale-precondition" }); throw new ApiError(409, "Spending limit changed after preview; preview again"); }
    let writeError = null;
    try { await graphRequest(`/${accountId}`, token, { method: "POST", form: { spend_cap: binding.targetMinor } }); } catch (error) { writeError = error; if (!error.writeAttempted) throw error; }
    let after;
    try { after = await freshCap(accountId, token); } catch (readError) { await finish("unknown", { errorCategory: writeError?.category || readError.category || "verification" }); throw new ApiError(502, "Spend-cap write outcome is unknown; refresh the account before trying again"); }
    if (after.current.toString() !== binding.targetMinor) { await finish(writeError ? "failed" : "unknown", { errorCategory: writeError?.category || "verification" }); throw new ApiError(502, writeError ? writeError.message : "Meta did not confirm the requested spending limit"); }
    const result = { verified: true, receiptId: String(receipt._id), accountId, operation: body.operation, currency: binding.currency, old: majorString(BigInt(binding.currentMinor), exp), change: `${body.operation === "reduce" ? "-" : body.operation === "add" ? "+" : "="}${majorString(amount, exp)}`, target: majorString(after.current, exp), appliedAt: new Date().toISOString() };
    await finish("succeeded", { result });
    await FacebookAdAccountCache.deleteMany({ agency: agencyId, accountId });
    try { await ActivityLog.create({ agency: agencyId, actor: actorId, entityType: "settings", entityId: credential._id, action: "facebook_spend_cap_updated", detail: `Spending limit updated for ${accountId}`, metadata: { accountId, operation: body.operation, old: result.old, target: result.target, currency: result.currency } }); } catch (error) { console.error("Spend-cap audit write failed", { receiptId: String(receipt._id), message: error.message }); }
    return result;
  } catch (error) {
    if (!finalized) await finish("failed", { errorCategory: error.category || "request" });
    throw error;
  }
}
