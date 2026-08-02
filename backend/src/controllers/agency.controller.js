import Agency from "../models/Agency.model.js";
import ApiCredential from "../models/ApiCredential.model.js";
import { getFacebookOverviewForAgency, syncFacebookInsightsForAgency } from "../services/facebookOverview.service.js";
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
  const { accessToken, defaultAdAccountId } = req.body;
  const credential = await ApiCredential.findOneAndUpdate(
    { agency: req.params.agencyId },
    {
      accessToken,
      defaultAdAccountId,
      agency: req.params.agencyId,
      provider: "facebook",
      isConnected: Boolean(accessToken && defaultAdAccountId),
      lastVerifiedAt: new Date(),
    },
    { new: true, upsert: true, runValidators: true }
  );

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
