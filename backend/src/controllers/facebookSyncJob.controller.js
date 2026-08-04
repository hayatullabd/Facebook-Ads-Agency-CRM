import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  enqueueFacebookAccountRetry, enqueueFacebookSync, getActiveFacebookSyncJob,
  getFacebookSyncJob, isObjectId, listFacebookSyncJobs,
} from "../services/facebookSyncJob.service.js";

function validateAccountId(value) {
  if (!/^act_\d+$/.test(value || "")) throw new ApiError(400, "Invalid Facebook ad account ID");
}

export const createFacebookSyncJob = asyncHandler(async (req, res) => {
  const result = await enqueueFacebookSync(req.params.agencyId, req.user._id);
  res.status(202).json(new ApiResponse(202, result.job, result.existing ? "Active Facebook sync returned" : "Facebook sync queued"));
});

export const getActiveFacebookSync = asyncHandler(async (req, res) => {
  res.json(new ApiResponse(200, await getActiveFacebookSyncJob(req.params.agencyId)));
});

export const getFacebookSyncHistory = asyncHandler(async (req, res) => {
  const limit = req.query.limit === undefined ? 10 : Number(req.query.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) throw new ApiError(400, "limit must be an integer between 1 and 20");
  res.json(new ApiResponse(200, await listFacebookSyncJobs(req.params.agencyId, limit)));
});

export const getFacebookSyncDetail = asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.jobId)) throw new ApiError(400, "Invalid Facebook sync job ID");
  const job = await getFacebookSyncJob(req.params.agencyId, req.params.jobId);
  if (!job) throw new ApiError(404, "Facebook sync job not found");
  res.json(new ApiResponse(200, job));
});

export const retryFacebookSyncAccount = asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.jobId)) throw new ApiError(400, "Invalid Facebook sync job ID");
  validateAccountId(req.params.accountId);
  const job = await enqueueFacebookAccountRetry(req.params.agencyId, req.params.jobId, req.params.accountId, req.user._id);
  res.status(202).json(new ApiResponse(202, job, "Facebook account retry queued"));
});
