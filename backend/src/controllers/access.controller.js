import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ROLE_FEATURES } from "../utils/accessControl.js";

export const getAccessMatrix = asyncHandler(async (_req, res) => {
  res.json(new ApiResponse(200, { roles: ROLE_FEATURES }));
});
