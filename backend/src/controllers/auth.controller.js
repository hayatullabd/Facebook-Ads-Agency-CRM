import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Agency from "../models/Agency.model.js";
import User from "../models/User.model.js";
import { env } from "../config/env.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getPasswordPolicyError } from "../services/passwordPolicy.service.js";

const signToken = (user) => jwt.sign(
  { id: user._id, role: user.role, agency: user.agency, client: user.client },
  env.jwtSecret,
  { expiresIn: "7d" }
);

const serializePublicUser = (user) => {
  const data = user.toObject ? user.toObject() : { ...user };
  delete data.password;
  return data;
};

export const register = asyncHandler(async (req, res) => {
  const { agencyName, name, email, password } = req.body;
  const passwordError = getPasswordPolicyError(password);
  if (passwordError) {
    return res.status(400).json({ success: false, message: passwordError });
  }

  const agencyId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();

  const agency = await Agency.create({
    _id: agencyId,
    name: agencyName,
    slug: agencyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    owner: userId,
  });

  const user = await User.create({
    _id: userId,
    agency: agency._id,
    name,
    email,
    password,
    role: "admin",
  });

  res.status(201).json(new ApiResponse(201, {
    user: serializePublicUser(user),
    agency,
    token: signToken(user),
  }, "Account created"));
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ success: false, message: "Invalid email or password" });
  }

  user.lastLoginAt = new Date();
  await user.save();

  res.json(new ApiResponse(200, {
    user: serializePublicUser(user),
    token: signToken(user),
  }, "Logged in"));
});
