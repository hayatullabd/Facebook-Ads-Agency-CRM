import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { applySpendCap, getAccountDetail, listAccounts, previewSpendCap } from "../services/adAccounts.service.js";

const bodyFields = (body) => ({ operation: body?.operation, amount: body?.amount, confirmationToken: body?.confirmationToken });

export const getAdAccounts = asyncHandler(async (req, res) => res.json(new ApiResponse(200, await listAccounts(req.params.agencyId))));
export const getAdAccountDetail = asyncHandler(async (req, res) => {
  if (req.query.refresh !== undefined && !["0", "1"].includes(req.query.refresh)) throw new ApiError(400, "refresh must be 0 or 1");
  const data = await getAccountDetail(req.params.agencyId, req.params.accountId, req.query.date, req.query.refresh === "1");
  res.json(new ApiResponse(200, data));
});
export const previewAdAccountSpendCap = asyncHandler(async (req, res) => {
  const data = await previewSpendCap(req.params.agencyId, req.params.accountId, req.user._id, bodyFields(req.body));
  res.json(new ApiResponse(200, data));
});
export const updateAdAccountSpendCap = asyncHandler(async (req, res) => {
  const key = req.get("Idempotency-Key")?.trim();
  if (!key || !/^[A-Za-z0-9._:-]{8,128}$/.test(key)) throw new ApiError(400, "Idempotency-Key must be 8-128 safe characters");
  const body = bodyFields(req.body);
  if (typeof body.confirmationToken !== "string" || !body.confirmationToken) throw new ApiError(400, "Confirmation token is required");
  const data = await applySpendCap(req.params.agencyId, req.params.accountId, req.user._id, key, body);
  res.json(new ApiResponse(200, data, "Spending limit updated and verified"));
});
