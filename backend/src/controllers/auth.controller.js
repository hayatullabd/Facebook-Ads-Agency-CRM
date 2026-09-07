import User from "../models/User.model.js";
import { ApiError } from "../utils/ApiError.js";
import { getPasswordPolicyError } from "../services/passwordPolicy.service.js";
import { registerAccount, loginAccount } from "../services/auth.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { serializePublicUser } from "../utils/serializePublicUser.js";

export const register = asyncHandler(async (req, res) => {
  const result = await registerAccount(req.body);
  if (result.passwordError) return res.status(400).json({ success: false, message: result.passwordError });
  if (result.duplicateError) return res.status(409).json({ success: false, message: result.duplicateError });
  if (result.pending) {
    return res.status(202).json(new ApiResponse(202, {
      status: "pending",
      user: serializePublicUser(result.user),
      agency: result.agency,
    }, "Registration submitted for approval"));
  }
  res.status(201).json(new ApiResponse(201, {
    user: serializePublicUser(result.user),
    agency: result.agency,
    token: result.token,
  }, "Account created"));
});

export const login = asyncHandler(async (req, res) => {
  const result = await loginAccount(req.body);
  if (!result) return res.status(401).json({ success: false, message: "Invalid email or password" });
  res.json(new ApiResponse(200, { user: serializePublicUser(result.user), token: result.token }, "Logged in"));
});

export const me = (req, res) => res.json(new ApiResponse(200, serializePublicUser(req.user)));
export const logout = asyncHandler(async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
  res.json(new ApiResponse(200, null, "All sessions revoked"));
});
export const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("+password +tokenVersion");
  if (!user || !await user.comparePassword(req.body.currentPassword)) throw new ApiError(400, "Current password is incorrect");
  const error = getPasswordPolicyError(req.body.newPassword);
  if (error) throw new ApiError(400, error);
  if (await user.comparePassword(req.body.newPassword)) throw new ApiError(400, "Choose a different password");
  user.password = req.body.newPassword;
  await user.save();
  res.json(new ApiResponse(200, null, "Password changed. Sign in again on all devices."));
});
