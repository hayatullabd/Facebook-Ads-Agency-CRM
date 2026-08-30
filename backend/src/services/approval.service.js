import Agency from "../models/Agency.model.js";
import User from "../models/User.model.js";
import { ROLES, USER_STATUSES, WORKSPACE_STATUSES } from "../constants/roles.js";
import { ApiError } from "../utils/ApiError.js";
import { validateClientAndAdRequest } from "./referenceValidation.service.js";

export const listPendingWorkspaces = () => Agency.find({ status: WORKSPACE_STATUSES.PENDING })
  .populate("owner", "name email role platformRole status")
  .sort({ createdAt: 1 });

export const decideWorkspace = async (agencyId, decision) => {
  if (!["approve", "reject"].includes(decision)) throw new ApiError(400, "Invalid approval decision");
  const agency = await Agency.findById(agencyId);
  if (!agency) throw new ApiError(404, "Workspace not found");
  if (agency.status !== WORKSPACE_STATUSES.PENDING) throw new ApiError(409, "Workspace is not pending approval");
  const approved = decision === "approve";
  agency.status = approved ? WORKSPACE_STATUSES.ACTIVE : WORKSPACE_STATUSES.REJECTED;
  await agency.save();
  await User.updateOne(
    { _id: agency.owner, agency: agency._id },
    { $set: { status: approved ? USER_STATUSES.ACTIVE : USER_STATUSES.REJECTED, isActive: approved } }
  );
  return agency.populate("owner", "name email role platformRole status isActive");
};

export const listPendingUsers = (agencyId) => User.find({ agency: agencyId, status: USER_STATUSES.PENDING })
  .select("name email role client status createdAt")
  .populate("client", "name email")
  .sort({ createdAt: 1 });

export const decideUser = async ({ agencyId, userId, decision, role, client }) => {
  if (!["approve", "reject"].includes(decision)) throw new ApiError(400, "Invalid approval decision");
  const user = await User.findOne({ _id: userId, agency: agencyId });
  if (!user) throw new ApiError(404, "User not found");
  if (user.status !== USER_STATUSES.PENDING) throw new ApiError(409, "User is not pending approval");
  if (user.role === ROLES.OWNER) throw new ApiError(403, "Workspace owners require platform approval");

  if (decision === "reject") {
    user.status = USER_STATUSES.REJECTED;
    user.isActive = false;
  } else {
    const nextRole = role || user.role;
    if (![ROLES.TEAM, ROLES.CLIENT, ROLES.MODERATOR].includes(nextRole)) {
      throw new ApiError(400, "Approved users must be team, client, or moderator");
    }
    const nextClient = client !== undefined ? client : user.client;
    if ([ROLES.CLIENT, ROLES.MODERATOR].includes(nextRole)) {
      if (!nextClient) throw new ApiError(400, "client is required for client and moderator roles");
      await validateClientAndAdRequest({ agencyId, clientId: nextClient, required: false });
      user.client = nextClient;
    } else {
      user.client = null;
    }
    user.role = nextRole;
    user.status = USER_STATUSES.ACTIVE;
    user.isActive = true;
  }
  await user.save();
  return user;
};
