import Agency from "../models/Agency.model.js";
import ApiCredential from "../models/ApiCredential.model.js";
import { discoverFacebookAdAccounts, disconnectFacebookForAgency, getFacebookAccountsForAgency, getFacebookOverviewForAgency } from "../services/facebookOverview.service.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { decryptFacebookToken, encryptFacebookToken } from "../utils/facebookTokenCrypto.js";

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
  const existing = await ApiCredential.findOne({ agency: req.params.agencyId }).select("+accessToken credentialGeneration");
  const suppliedToken = req.body.accessToken?.trim();
  const accessToken = suppliedToken || decryptFacebookToken(existing?.accessToken || "");
  if (!accessToken) throw new ApiError(400, "Facebook access token is required");
  const defaultAdAccountId = req.body.defaultAdAccountId
    ? `act_${req.body.defaultAdAccountId.replace(/^act_/, "")}`
    : "";
  const adAccounts = await discoverFacebookAdAccounts(accessToken);
  if (defaultAdAccountId && !adAccounts.some((account) => account.facebookAdAccountId === defaultAdAccountId)) {
    throw new ApiError(400, "Default Facebook ad account is not accessible with this token");
  }
  const now = new Date();
  const nextGeneration = (existing?.credentialGeneration || 0) + 1;
  const credential = await ApiCredential.findOneAndUpdate(
    { agency: req.params.agencyId },
    { $set: { accessToken: encryptFacebookToken(accessToken), credentialGeneration: nextGeneration, defaultAdAccountId, adAccounts, agency: req.params.agencyId, provider: "facebook", isConnected: true, lastVerifiedAt: now, lastAccountSyncAt: now } },
    { new: true, upsert: true, runValidators: true }
  ).select("-accessToken");
  await import("../models/FacebookSyncJob.model.js").then(({ default: FacebookSyncJob }) => FacebookSyncJob.updateMany(
    { agency: req.params.agencyId, status: { $in: ["queued", "running"] } },
    { $set: { status: "failed", stage: "complete", completedAt: now, error: { message: "Facebook credential changed", category: "credential", retryable: false }, leaseOwner: null, leaseToken: null, leaseExpiresAt: null } }
  ));
  res.json(new ApiResponse(200, credential, "Facebook API settings saved"));
});

export const getFacebookOverview = asyncHandler(async (req, res) => {
  const clientId = ["client", "moderator"].includes(req.user.role) ? req.user.client : null;
  const overview = await getFacebookOverviewForAgency(req.params.agencyId, clientId);
  res.json(new ApiResponse(200, overview));
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
