import ActivityLog from "../models/ActivityLog.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getActivityLogs = asyncHandler(async (req, res) => {
  const logs = await ActivityLog.find({ agency: req.params.agencyId }).populate("actor client adRequest").sort({ createdAt: -1 }).limit(100);
  res.json(new ApiResponse(200, logs));
});
