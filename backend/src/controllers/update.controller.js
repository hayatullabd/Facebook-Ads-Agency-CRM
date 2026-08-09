import ClientUpdate from "../models/ClientUpdate.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateClientAndAdRequest } from "../services/referenceValidation.service.js";
export const getUpdates = asyncHandler(async (req, res) => {
  const query = { agency: req.params.agencyId };
  if (["client", "moderator"].includes(req.user.role)) query.client = req.user.client;
  const updates = await ClientUpdate.find(query).populate("client adRequest sentBy").sort({ createdAt: -1 });
  res.json(new ApiResponse(200, updates));
});

export const createUpdate = asyncHandler(async (req, res) => {
  const { client, adRequest, type, title, content } = req.body;
  await validateClientAndAdRequest({ agencyId: req.params.agencyId, clientId: client, adRequestId: adRequest });
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

export const updateClientUpdate = asyncHandler(async (req, res) => {
  const fields = Object.fromEntries(
    ["client", "adRequest", "type", "title", "content"]
      .filter((field) => req.body[field] !== undefined)
      .map((field) => [field, req.body[field]])
  );
  const update = await ClientUpdate.findOne({ _id: req.params.updateId, agency: req.params.agencyId });
  if (!update) throw new ApiError(404, "Update not found");
  if (fields.client !== undefined || fields.adRequest !== undefined) {
    await validateClientAndAdRequest({
      agencyId: req.params.agencyId,
      clientId: fields.client ?? update.client,
      adRequestId: fields.adRequest ?? update.adRequest,
    });
  }
  Object.assign(update, fields);
  await update.save();
  res.json(new ApiResponse(200, update, "Update edited"));
});

export const deleteUpdate = asyncHandler(async (req, res) => {
  const query = { _id: req.params.updateId, agency: req.params.agencyId };
  if (["client", "moderator"].includes(req.user.role)) query.client = req.user.client;
  const update = await ClientUpdate.findOneAndDelete(query);
  if (!update) throw new ApiError(404, "Update not found");
  res.json(new ApiResponse(200, null, "Update deleted"));
});

export const markUpdateRead = asyncHandler(async (req, res) => {
  const query = { _id: req.params.updateId, agency: req.params.agencyId };
  if (["client", "moderator"].includes(req.user.role)) query.client = req.user.client;
  const update = await ClientUpdate.findOneAndUpdate(
    query,
    { $addToSet: { readBy: { user: req.user._id, readAt: new Date() } } },
    { new: true }
  ).populate("client adRequest sentBy readBy.user");
  if (!update) throw new ApiError(404, "Update not found");
  res.json(new ApiResponse(200, update, "Update marked as read"));
});
