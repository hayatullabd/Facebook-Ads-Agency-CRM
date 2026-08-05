import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { ROLES } from "../constants/roles.js";
import Agency from "../models/Agency.model.js";
import User from "../models/User.model.js";
import { getPasswordPolicyError } from "./passwordPolicy.service.js";

const signToken = (user) => jwt.sign(
  { id: user._id, role: user.role, agency: user.agency, client: user.client },
  env.jwtSecret,
  { expiresIn: "7d" }
);

export const registerAccount = async ({ agencyName, name, email, password }) => {
  const passwordError = getPasswordPolicyError(password);
  if (passwordError) return { passwordError };
  const normalizedAgencyName = agencyName.trim();
  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const agencyId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  let agency;
  try {
    agency = await Agency.create({
      _id: agencyId,
      name: normalizedAgencyName,
      slug: normalizedAgencyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      owner: userId,
    });
    const user = await User.create({ _id: userId, agency: agency._id, name: normalizedName, email: normalizedEmail, password, role: ROLES.ADMIN });
    return { agency, user, token: signToken(user) };
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
  user.lastLoginAt = new Date();
  await user.save();
  return { user, token: signToken(user) };
};
