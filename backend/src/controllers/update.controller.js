import ClientUpdate from "../models/ClientUpdate.model.js";
import { validateClientAndRequest } from "../utils/validateTenantRelations.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getUpdates = asyncHandler(async (req, res) => {
  const query = { agency: req.params.agencyId };
  if (["client", "moderator"].includes(req.user.role)) query.client = req.user.client;
  const updates = await ClientUpdate.find(query).populate("client adRequest sentBy").sort({ createdAt: -1 });
  res.json(new ApiResponse(200, updates));
});

export const createUpdate = asyncHandler(async (req, res) => {
  const { client, adRequest, type, title, content } = req.body;
  await validateClientAndRequest({ agencyId: req.params.agencyId, clientId: client, adRequestId: adRequest });
  const update = await ClientUpdate.create({
    agency: req.params.agencyId,
    client,
    adRequest,
    type,
    title,
    content,
    sentBy: req.user._id,
  });
  res.status(201).json(new ApiResponse(201, update, "Update sent"));
});

export const markUpdateRead = asyncHandler(async (req, res) => {
  const query = { _id: req.params.updateId, agency: req.params.agencyId };
  if (["client", "moderator"].includes(req.user.role)) query.client = req.user.client;
  const update = await ClientUpdate.findOneAndUpdate(
    query,
    { $addToSet: { readBy: { user: req.user._id, readAt: new Date() } } },
    { new: true }
  );
  if (!update) throw new ApiError(404, "Update not found");
  res.json(new ApiResponse(200, update, "Update marked as read"));
});
