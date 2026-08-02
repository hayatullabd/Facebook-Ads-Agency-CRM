import User from "../models/User.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getPasswordPolicyError } from "../services/passwordPolicy.service.js";

const sanitizeUser = (user) => {
  const data = user.toObject ? user.toObject() : user;
  delete data.password;
  return data;
};

const canManageRole = (actor, targetRole, targetClient) => {
  const normalizeId = (value) => (value?._id ? String(value._id) : String(value));

  if (actor.role === "admin") return ["team", "client", "moderator"].includes(targetRole);
  if (actor.role === "team") return ["client", "moderator"].includes(targetRole);
  if (actor.role === "client") return targetRole === "moderator" && normalizeId(actor.client) === normalizeId(targetClient);
  return false;
};

export const getUsers = asyncHandler(async (req, res) => {
  const query = { agency: req.params.agencyId };

  if (["client", "moderator"].includes(req.user.role)) {
    query.client = req.user.client;
    query.role = { $in: ["client", "moderator"] };
  }

  const users = await User.find(query).populate("client", "name email").sort({ createdAt: -1 });
  res.json(new ApiResponse(200, users.map(sanitizeUser)));
});

export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, client } = req.body;
  const passwordError = getPasswordPolicyError(password);
  if (passwordError) {
    throw new ApiError(400, passwordError);
  }

  if (!canManageRole(req.user, role, client)) {
    throw new ApiError(403, "You do not have permission to create this user");
  }

  const user = await User.create({
    agency: req.params.agencyId,
    client: ["client", "moderator"].includes(role) ? client : null,
    name,
    email,
    password,
    role,
    avatarColor: role === "team" ? "bg-emerald-600" : role === "moderator" ? "bg-amber-600" : "bg-violet-600",
  });

  res.status(201).json(new ApiResponse(201, sanitizeUser(user), "User created"));
});

export const removeUser = asyncHandler(async (req, res) => {
  const target = await User.findOne({ _id: req.params.userId, agency: req.params.agencyId });

  if (!target) {
    throw new ApiError(404, "User not found");
  }

  if (target.role === "admin") {
    throw new ApiError(403, "Admin user cannot be removed from this panel");
  }

  if (!canManageRole(req.user, target.role, target.client)) {
    throw new ApiError(403, "You do not have permission to remove this user");
  }

  await target.deleteOne();
  res.json(new ApiResponse(200, null, "User removed"));
});
