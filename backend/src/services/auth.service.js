import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { PLATFORM_ROLES, ROLES, USER_STATUSES, WORKSPACE_STATUSES } from "../constants/roles.js";
import Agency from "../models/Agency.model.js";
import { ApiError } from "../utils/ApiError.js";
import User from "../models/User.model.js";
import { getPasswordPolicyError } from "./passwordPolicy.service.js";

const signToken = (user) => jwt.sign(
  { id: user._id, role: user.role, agency: user.agency, client: user.client },
  env.jwtSecret,
  { expiresIn: "7d" }
);

export const registerAccount = async ({ agencyName, name, email, password, mode = "create" }) => {
  const passwordError = getPasswordPolicyError(password);
  if (passwordError) return { passwordError };
  const normalizedAgencyName = agencyName.trim();
  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (mode === "join") {
    const agency = await Agency.findOne({
      status: { $in: [WORKSPACE_STATUSES.ACTIVE, null] },
      $or: [
        { slug: normalizedAgencyName.toLowerCase() },
        { name: { $regex: `^${normalizedAgencyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } },
      ],
    });
    if (!agency) return { duplicateError: "Workspace not found" };
    try {
      const user = await User.create({
        agency: agency._id,
        name: normalizedName,
        email: normalizedEmail,
        password,
        role: ROLES.CLIENT,
        status: USER_STATUSES.PENDING,
        isActive: false,
      });
      return { user, pending: true };
    } catch (error) {
      if (error?.code === 11000) return { duplicateError: "An account with this email already exists" };
      throw error;
    }
  }

  const agencyId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  let agency;
  try {
    agency = await Agency.create({
      _id: agencyId,
      name: normalizedAgencyName,
      slug: normalizedAgencyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      owner: userId,
      status: WORKSPACE_STATUSES.PENDING,
    });
    const user = await User.create({
      _id: userId,
      agency: agency._id,
      name: normalizedName,
      email: normalizedEmail,
      password,
      role: ROLES.OWNER,
      status: USER_STATUSES.PENDING,
      isActive: false,
    });
    return { agency, user, pending: true };
  } catch (error) {
    if (agency) {
      try {
        await Agency.deleteOne({ _id: agency._id });
      } catch {
        // Preserve the user creation error; the orphaned agency can be reconciled separately.
      }
    }
    if (error?.code === 11000 && error?.keyPattern?.email) {
      return { duplicateError: "An account with this email already exists" };
    }
    if (error?.code === 11000 && error?.keyPattern?.slug) {
      return { duplicateError: "An agency with this name already exists" };
    }
    throw error;
  }
};

export const loginAccount = async ({ email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select("+password");
  if (!user || !(await user.comparePassword(password))) return null;
  if (user.status === USER_STATUSES.PENDING) throw new ApiError(403, "Account is pending approval");
  if (user.status === USER_STATUSES.REJECTED) throw new ApiError(403, "Account registration was rejected");
  if (user.status === USER_STATUSES.SUSPENDED || user.isActive === false) throw new ApiError(403, "Account is suspended");
  const agency = await Agency.findById(user.agency).select("status");
  if ((user.platformRole || PLATFORM_ROLES.USER) !== PLATFORM_ROLES.ADMIN) {
    if (!agency) throw new ApiError(403, "Workspace is unavailable");
    if (agency.status === WORKSPACE_STATUSES.PENDING) throw new ApiError(403, "Workspace is pending approval");
    if (agency.status === WORKSPACE_STATUSES.REJECTED) throw new ApiError(403, "Workspace registration was rejected");
    if (agency.status === WORKSPACE_STATUSES.SUSPENDED) throw new ApiError(403, "Workspace is suspended");
  }
  user.lastLoginAt = new Date();
  await user.save();
  return { user, token: signToken(user) };
};
