import User from "../models/User.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createManagedUser, removeManagedUser, serializePublicUser, updateManagedUser } from "../services/userManagement.service.js";

export const getUsers = asyncHandler(async (req, res) => {
  const query = { agency: req.params.agencyId };
  if (["client", "moderator"].includes(req.user.role)) {
    query.client = req.user.client;
    query.role = { $in: ["client", "moderator"] };
  }
  const users = await User.find(query).populate("client", "name email").sort({ createdAt: -1 });
  res.json(new ApiResponse(200, users.map(serializePublicUser)));
});

export const createUser = asyncHandler(async (req, res) => {
  const user = await createManagedUser({ agencyId: req.params.agencyId, actor: req.user, ...req.body });
  res.status(201).json(new ApiResponse(201, serializePublicUser(user), "User created"));
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await updateManagedUser({
    agencyId: req.params.agencyId,
    actor: req.user,
    userId: req.params.userId,
    fields: req.body,
  });
  res.json(new ApiResponse(200, serializePublicUser(user), "User updated"));
});

export const removeUser = asyncHandler(async (req, res) => {
  await removeManagedUser({ agencyId: req.params.agencyId, actor: req.user, userId: req.params.userId });
  res.json(new ApiResponse(200, null, "User removed"));
});
