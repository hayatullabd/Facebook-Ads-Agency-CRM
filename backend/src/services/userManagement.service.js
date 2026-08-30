import User from "../models/User.model.js";
import { ApiError } from "../utils/ApiError.js";
import { getPasswordPolicyError } from "./passwordPolicy.service.js";
import { serializePublicUser } from "../utils/serializePublicUser.js";
import { validateClientAndAdRequest } from "./referenceValidation.service.js";

const normalizeId = (value) => (value?._id ? String(value._id) : String(value));
const canManageRole = (actor, targetRole, targetClient) => {
  if (actor.role === "owner") return ["admin", "team", "client", "moderator"].includes(targetRole);
  if (actor.role === "admin") return ["team", "client", "moderator"].includes(targetRole);
  if (actor.role === "team") return ["client", "moderator"].includes(targetRole);
  if (actor.role === "client") return targetRole === "moderator" && normalizeId(actor.client) === normalizeId(targetClient);
  return false;
};

export const createManagedUser = async ({ agencyId, actor, name, email, password, role, client }) => {
  const passwordError = getPasswordPolicyError(password);
  if (passwordError) throw new ApiError(400, passwordError);
  if (!canManageRole(actor, role, client)) throw new ApiError(403, "You do not have permission to create this user");
  if (["client", "moderator"].includes(role)) {
    await validateClientAndAdRequest({ agencyId, clientId: client, required: false });
    if (!client) throw new ApiError(400, "Client is required");
  }
  try {
    return await User.create({ agency: agencyId, client: ["client", "moderator"].includes(role) ? client : null, name: name.trim(), email: email.trim().toLowerCase(), password, role, avatarColor: role === "team" ? "bg-emerald-600" : role === "moderator" ? "bg-amber-600" : "bg-violet-600" });
  } catch (error) {
    if (error?.code === 11000) throw new ApiError(409, "An account with this email already exists");
    throw error;
  }
};

export const updateManagedUser = async ({ agencyId, actor, userId, fields }) => {
  const target = await User.findOne({ _id: userId, agency: agencyId });
  if (!target) throw new ApiError(404, "User not found");

  const isSelf = normalizeId(actor._id) === normalizeId(target._id);
  const canManageTarget = canManageRole(actor, target.role, target.client)
    || (["owner", "admin"].includes(actor.role) && actor.role === target.role && isSelf);
  if (!canManageTarget) throw new ApiError(403, "You do not have permission to update this user");

  const nextRole = fields.role ?? target.role;
  const nextClient = fields.client !== undefined ? fields.client : target.client;
  const roleOrClientChanged = fields.role !== undefined && fields.role !== target.role
    || fields.client !== undefined && normalizeId(fields.client) !== normalizeId(target.client);
  if (roleOrClientChanged && !canManageRole(actor, nextRole, nextClient)) {
    throw new ApiError(403, "You do not have permission to assign this role or client");
  }
  if (isSelf && (nextRole !== target.role || fields.isActive === false)) {
    throw new ApiError(409, "You cannot demote or deactivate your own account");
  }
  if (["owner", "admin"].includes(target.role) && (nextRole !== target.role || fields.isActive === false)) {
    const activeRoleCount = await User.countDocuments({ agency: agencyId, role: target.role, isActive: true });
    if (activeRoleCount <= 1) throw new ApiError(409, `The last active ${target.role} cannot be demoted or deactivated`);
  }

  if (["client", "moderator"].includes(nextRole)) {
    if (!nextClient) throw new ApiError(400, "Client is required");
    await validateClientAndAdRequest({ agencyId, clientId: nextClient, required: false });
  }
  const updates = { ...fields, client: ["client", "moderator"].includes(nextRole) ? nextClient : null };
  if (updates.email !== undefined) {
    updates.email = updates.email.trim().toLowerCase();
    const duplicate = await User.exists({ email: updates.email, _id: { $ne: target._id } });
    if (duplicate) throw new ApiError(409, "An account with this email already exists");
  }
  Object.assign(target, updates);
  try {
    await target.save();
  } catch (error) {
    if (error?.code === 11000) throw new ApiError(409, "An account with this email already exists");
    throw error;
  }
  return target;
};

export const removeManagedUser = async ({ agencyId, actor, userId }) => {
  const target = await User.findOne({ _id: userId, agency: agencyId });
  if (!target) throw new ApiError(404, "User not found");
  if (target.role === "owner" || !canManageRole(actor, target.role, target.client)) throw new ApiError(403, "You do not have permission to remove this user");
  if (target.role === "admin") {
    const activeAdminCount = await User.countDocuments({ agency: agencyId, role: "admin", isActive: true });
    if (activeAdminCount <= 1) throw new ApiError(409, "The last active admin cannot be removed");
  }
  await target.deleteOne();
};

export { canManageRole, serializePublicUser };
