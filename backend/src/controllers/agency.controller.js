import Agency from "../models/Agency.model.js";
import ApiCredential from "../models/ApiCredential.model.js";
import { discoverFacebookAdAccounts, disconnectFacebookForAgency, getFacebookAccountsForAgency, getFacebookOverviewForAgency } from "../services/facebookOverview.service.js";
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

const sanitizePaymentDetails = (items) => items.map((item) => ({
  method: item.method,
  name: item.method === "bank" ? "" : String(item.name || "").trim(),
  accountName: String(item.accountName || "").trim(),
  accountNumber: String(item.accountNumber || "").trim(),
  bankName: item.method === "bank" ? String(item.bankName || "").trim() : "",
  branchName: item.method === "bank" ? String(item.branchName || "").trim() : "",
  routingNumber: item.method === "bank" ? String(item.routingNumber || "").trim() : "",
}));

export const getAgencyPaymentDetails = asyncHandler(async (req, res) => {
  const agency = await Agency.findById(req.params.agencyId).select("paymentDetails");
  if (!agency) throw new ApiError(404, "Agency not found");
  res.json(new ApiResponse(200, agency.paymentDetails || []));
});

export const saveAgencyPaymentDetails = asyncHandler(async (req, res) => {
  const paymentDetails = sanitizePaymentDetails(req.body.paymentDetails);
  const agency = await Agency.findByIdAndUpdate(
    req.params.agencyId,
    { paymentDetails },
    { new: true, runValidators: true }
  ).select("paymentDetails");
  if (!agency) throw new ApiError(404, "Agency not found");
  res.json(new ApiResponse(200, agency.paymentDetails, "Payment details saved"));
});

export const saveFacebookCredential = asyncHandler(async (req, res) => {
  const accessToken = req.body.accessToken?.trim();
  if (!accessToken) throw new ApiError(400, "Facebook access token is required");
  const defaultAdAccountId = req.body.defaultAdAccountId
    ? `act_${req.body.defaultAdAccountId.replace(/^act_/, "")}`
    : "";
  let adAccounts;
  try {
    adAccounts = await discoverFacebookAdAccounts(accessToken);
  } catch (error) {
    throw error;
  }
  if (defaultAdAccountId && !adAccounts.some((account) => account.facebookAdAccountId === defaultAdAccountId)) {
    throw new ApiError(400, "Default Facebook ad account is not accessible with this token");
  }
  const now = new Date();
  if (!process.env.FACEBOOK_GRAPH_VERSION?.trim()) throw new ApiError(500, "FACEBOOK_GRAPH_VERSION is not configured");
  const credential = await ApiCredential.findOneAndUpdate(
    { agency: req.params.agencyId },
    { $set: { accessToken, defaultAdAccountId, adAccounts, agency: req.params.agencyId, provider: "facebook", isConnected: true, lastVerifiedAt: now, lastAccountSyncAt: now } },
    { new: true, upsert: true, runValidators: true }
  ).select("-accessToken");

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
  const message = result.remoteRevoked
    ? "Facebook access revoked and disconnected"
    : result.remoteError
      ? "Facebook disconnected locally, but Facebook did not confirm the revoke"
      : "Facebook disconnected locally";
  res.json(new ApiResponse(200, result, message));
});
