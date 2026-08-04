import { getDashboardSummaryData } from "../services/dashboard.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getDashboardSummary = asyncHandler(async (req, res) => {
  const client = ["client", "moderator"].includes(req.user.role) ? req.user.client : null;
  const data = await getDashboardSummaryData(req.params.agencyId, client);
  res.json(new ApiResponse(200, data));
});
