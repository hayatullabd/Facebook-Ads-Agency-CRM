import Agency from "../models/Agency.model.js";
import ApiCredential from "../models/ApiCredential.model.js";
import { discoverFacebookAdAccounts, disconnectFacebookForAgency, getFacebookAccountsForAgency, getFacebookOverviewForAgency, syncFacebookInsightsForAgency } from "../services/facebookOverview.service.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getAgency = asyncHandler(async (req, res) => {
  const agency = await Agency.findById(req.params.agencyId);
  if (!agency) throw new ApiError(404, "Agency not found");
  res.json(new ApiResponse(200, agency));
});

export const updateAgency = asyncHandler(async (req, res) => {
  const fields = ["name", "logoUrl", "defaultCurrency", "defaultRate", "onboardingCompleted"];
  const update = Object.fromEntries(fields.filter((field) => req.body[field] !== undefined).map((field) => [field, req.body[field]]));
  const agency = await Agency.findByIdAndUpdate(req.params.agencyId, update, { new: true, runValidators: true });
  if (!agency) throw new ApiError(404, "Agency not found");
  res.json(new ApiResponse(200, agency, "Agency updated"));
});

export const saveFacebookCredential = asyncHandler(async (req, res) => {
  const accessToken = req.body.accessToken.trim();
  const defaultAdAccountId = req.body.defaultAdAccountId
    ? `act_${req.body.defaultAdAccountId.replace(/^act_/, "")}`
    : "";
  // #region debug-point A-E:credential-save-start
  fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "facebook-token-save-500", runId: "pre-fix", hypothesisId: "A-E", location: "backend/src/controllers/agency.controller.js:saveFacebookCredential", msg: "[DEBUG] Facebook credential save started", data: { agencyId: req.params.agencyId, hasToken: Boolean(accessToken), tokenLength: accessToken.length, defaultAdAccountId: defaultAdAccountId || null }, ts: Date.now() }) }).catch(() => {});
  // #endregion
  let adAccounts;
  try {
    adAccounts = await discoverFacebookAdAccounts(accessToken);
    // #region debug-point A-E:account-discovery-success
    fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "facebook-token-save-500", runId: "pre-fix", hypothesisId: "A-E", location: "backend/src/controllers/agency.controller.js:saveFacebookCredential", msg: "[DEBUG] Facebook account discovery succeeded", data: { agencyId: req.params.agencyId, accountCount: adAccounts.length }, ts: Date.now() }) }).catch(() => {});
    // #endregion
  } catch (error) {
    // #region debug-point A-C-E:account-discovery-error
    fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "facebook-token-save-500", runId: "pre-fix", hypothesisId: "A-C-E", location: "backend/src/controllers/agency.controller.js:saveFacebookCredential", msg: "[DEBUG] Facebook account discovery failed", data: { agencyId: req.params.agencyId, errorName: error?.name || "unknown", statusCode: error?.statusCode || null, category: error?.category || null, message: error?.message || "unknown" }, ts: Date.now() }) }).catch(() => {});
    // #endregion
    throw error;
  }
  if (defaultAdAccountId && !adAccounts.some((account) => account.facebookAdAccountId === defaultAdAccountId)) {
    throw new ApiError(400, "Default Facebook ad account is not accessible with this token");
  }
  const now = new Date();
  let credential;
  try {
    credential = await ApiCredential.findOneAndUpdate(
      { agency: req.params.agencyId },
      { $set: { accessToken, defaultAdAccountId, adAccounts, agency: req.params.agencyId, provider: "facebook", isConnected: true, lastVerifiedAt: now, lastAccountSyncAt: now } },
      { new: true, upsert: true, runValidators: true }
    ).select("-accessToken");
    // #region debug-point B-D:credential-upsert-success
    fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "facebook-token-save-500", runId: "pre-fix", hypothesisId: "B-D", location: "backend/src/controllers/agency.controller.js:saveFacebookCredential", msg: "[DEBUG] Facebook credential upsert succeeded", data: { agencyId: req.params.agencyId, accountCount: credential?.adAccounts?.length ?? null, connected: credential?.isConnected === true }, ts: Date.now() }) }).catch(() => {});
    // #endregion
  } catch (error) {
    // #region debug-point B-D:credential-upsert-error
    fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "facebook-token-save-500", runId: "pre-fix", hypothesisId: "B-D", location: "backend/src/controllers/agency.controller.js:saveFacebookCredential", msg: "[DEBUG] Facebook credential upsert failed", data: { agencyId: req.params.agencyId, errorName: error?.name || "unknown", errorCode: error?.code || null, statusCode: error?.statusCode || null, message: error?.message || "unknown", validationFields: error?.errors ? Object.keys(error.errors) : [] }, ts: Date.now() }) }).catch(() => {});
    // #endregion
    throw error;
  }

  res.json(new ApiResponse(200, credential, "Facebook API settings saved"));
});

export const getFacebookOverview = asyncHandler(async (req, res) => {
  const clientId = ["client", "moderator"].includes(req.user.role) ? req.user.client : null;
  const overview = await getFacebookOverviewForAgency(req.params.agencyId, clientId);
  res.json(new ApiResponse(200, overview));
});

export const syncFacebookOverview = asyncHandler(async (req, res) => {
  const result = await syncFacebookInsightsForAgency(req.params.agencyId);
  res.json(new ApiResponse(200, result, result.message));
});

export const getFacebookAccounts = asyncHandler(async (req, res) => {
  const clientId = ["client", "moderator"].includes(req.user.role) ? req.user.client : null;
  const accounts = await getFacebookAccountsForAgency(req.params.agencyId, clientId);
  res.json(new ApiResponse(200, accounts));
});

export const disconnectFacebook = asyncHandler(async (req, res) => {
  const result = await disconnectFacebookForAgency(req.params.agencyId, req.body.revokeRemote === true);
  res.json(new ApiResponse(200, result, result.remoteRevoked ? "Facebook access revoked and disconnected" : "Facebook disconnected locally"));
});
