import { registerAccount, loginAccount } from "../services/auth.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { serializePublicUser } from "../utils/serializePublicUser.js";

export const register = asyncHandler(async (req, res) => {
  const result = await registerAccount(req.body);
  if (result.passwordError) return res.status(400).json({ success: false, message: result.passwordError });
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
