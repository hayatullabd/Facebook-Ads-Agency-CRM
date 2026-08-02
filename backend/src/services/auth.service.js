import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { ROLES } from "../constants/roles.js";
import Agency from "../models/Agency.model.js";
import User from "../models/User.model.js";
import { getPasswordPolicyError } from "./passwordPolicy.service.js";
import { ApiError } from "../utils/ApiError.js";

const signToken = (user) => jwt.sign(
  { id: user._id, role: user.role, agency: user.agency, client: user.client },
  env.jwtSecret,
  { expiresIn: "7d" }
);

export const registerAccount = async ({ agencyName, name, email, password }) => {
  const passwordError = getPasswordPolicyError(password);
  if (passwordError) return { passwordError };
  const agencyId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  let agency;
  try {
    agency = await Agency.create({
      _id: agencyId,
      name: agencyName,
      slug: agencyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      owner: userId,
    });
    const user = await User.create({ _id: userId, agency: agency._id, name, email, password, role: ROLES.ADMIN });
    return { agency, user, token: signToken(user) };
  } catch (error) {
    if (agency) await Agency.deleteOne({ _id: agency._id }).catch(() => {});
    if (error?.code === 11000) throw new ApiError(409, "Agency slug or email is already in use");
    throw error;
  }
};

export const loginAccount = async ({ email, password, agencySlug }) => {
  let users;
  if (agencySlug) {
    const agency = await Agency.findOne({ slug: agencySlug.trim().toLowerCase() }).select("_id");
    users = agency ? await User.find({ agency: agency._id, email }).select("+password").limit(2) : [];
  } else {
    users = await User.find({ email }).select("+password").limit(2);
    if (users.length > 1) throw new ApiError(409, "Multiple workspaces use this email; provide your agency slug");
  }
  const user = users[0];
  if (!user || !(await user.comparePassword(password))) return null;
  user.lastLoginAt = new Date();
  await user.save();
  return { user, token: signToken(user) };
};
