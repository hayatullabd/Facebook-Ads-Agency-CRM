import mongoose from "mongoose";
import User from "../models/User.model.js";
import Client from "../models/Client.model.js";
import { ApiError } from "../utils/ApiError.js";
import { getPasswordPolicyError } from "./passwordPolicy.service.js";
import { serializePublicUser } from "../utils/serializePublicUser.js";

const normalizeId = (value) => (value?._id ? String(value._id) : String(value));
const canManageRole = (actor, targetRole, targetClient) => {
  if (actor.role === "admin") return ["team", "client", "moderator"].includes(targetRole);
  if (actor.role === "team") return ["client", "moderator"].includes(targetRole);
  if (actor.role === "client") return targetRole === "moderator" && normalizeId(actor.client) === normalizeId(targetClient);
  return false;
};

export const createManagedUser = async ({ agencyId, actor, name, email, password, role, client }) => {
  const passwordError = getPasswordPolicyError(password);
  if (passwordError) throw new ApiError(400, passwordError);
  if (!canManageRole(actor, role, client)) throw new ApiError(403, "You do not have permission to create this user");
  if (["admin", "team"].includes(role) && client) throw new ApiError(400, "This role cannot be assigned to a client");
  if (["client", "moderator"].includes(role)) {
    if (!client || !mongoose.isValidObjectId(client)) throw new ApiError(400, "A valid client is required for this role");
    const ownedClient = await Client.findOne({ _id: client, agency: agencyId }).select("_id");
    if (!ownedClient) throw new ApiError(403, "Client does not belong to this agency");
  }
  return User.create({ agency: agencyId, client: ["client", "moderator"].includes(role) ? client : null, name, email, password, role, avatarColor: role === "team" ? "bg-emerald-600" : role === "moderator" ? "bg-amber-600" : "bg-violet-600" });
};

export const removeManagedUser = async ({ agencyId, actor, userId }) => {
  const target = await User.findOne({ _id: userId, agency: agencyId });
  if (!target) throw new ApiError(404, "User not found");
  if (target.role === "admin" || !canManageRole(actor, target.role, target.client)) throw new ApiError(403, "You do not have permission to remove this user");
  await target.deleteOne();
};

export { canManageRole, serializePublicUser };
