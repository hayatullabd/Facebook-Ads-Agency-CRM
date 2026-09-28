import mongoose from "mongoose";
import ActivityLog from "../models/ActivityLog.model.js";
import AdRequest from "../models/AdRequest.model.js";
import Agency from "../models/Agency.model.js";
import ApiCredential from "../models/ApiCredential.model.js";
import Attachment from "../models/Attachment.model.js";
import Campaign from "../models/Campaign.model.js";
import CampaignDailyStat from "../models/CampaignDailyStat.model.js";
import Client from "../models/Client.model.js";
import ClientUpdate from "../models/ClientUpdate.model.js";
import Comment from "../models/Comment.model.js";
import FacebookSyncJob from "../models/FacebookSyncJob.model.js";
import Invoice from "../models/Invoice.model.js";
import PaymentAccount from "../models/PaymentAccount.model.js";
import PaymentTransaction from "../models/PaymentTransaction.model.js";
import Sequence from "../models/Sequence.model.js";
import Subscription from "../models/Subscription.model.js";
import SubscriptionInvoice from "../models/SubscriptionInvoice.model.js";
import User from "../models/User.model.js";
import { PLATFORM_ROLES, ROLES, USER_STATUSES, WORKSPACE_STATUSES } from "../constants/roles.js";
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

const agencyDataModels = [
  User,
  Client,
  Campaign,
  CampaignDailyStat,
  AdRequest,
  Invoice,
  PaymentTransaction,
  PaymentAccount,
  ClientUpdate,
  Comment,
  Attachment,
  ActivityLog,
  ApiCredential,
  FacebookSyncJob,
  Subscription,
  SubscriptionInvoice,
  Sequence,
];

export const deleteWorkspace = async (agencyId, actor) => {
  const agency = await Agency.findById(agencyId);
  if (!agency) throw new ApiError(404, "Agency not found");
  if (String(agency._id) === String(actor?.agency)) throw new ApiError(403, "The platform workspace cannot be deleted");
  const protectedOwner = await User.exists({ agency: agency._id, platformRole: PLATFORM_ROLES.ADMIN });
  if (protectedOwner) throw new ApiError(403, "The platform workspace cannot be deleted");

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (const Model of agencyDataModels) {
        await Model.deleteMany({ agency: agency._id }).session(session);
      }
      await Agency.deleteOne({ _id: agency._id }).session(session);
    });
  } finally {
    await session.endSession();
  }
  return { deleted: true, _id: agency._id, name: agency.name };
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
