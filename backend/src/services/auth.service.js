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
  const agencyId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const agency = await Agency.create({
    _id: agencyId,
    name: agencyName,
    slug: agencyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    owner: userId,
  });
  const user = await User.create({ _id: userId, agency: agency._id, name, email, password, role: ROLES.ADMIN });
  return { agency, user, token: signToken(user) };
};

export const loginAccount = async ({ email, password }) => {
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) return null;
  user.lastLoginAt = new Date();
  await user.save();
  return { user, token: signToken(user) };
};
