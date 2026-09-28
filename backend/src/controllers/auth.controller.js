import { loginAccount } from "../services/auth.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { serializePublicUser } from "../utils/serializePublicUser.js";

export const register = asyncHandler(async (_req, res) => {
  res.status(403).json({ success: false, message: "Public signup is closed" });
});

export const login = asyncHandler(async (req, res) => {
  const result = await loginAccount(req.body);
  if (!result) return res.status(401).json({ success: false, message: "Invalid email or password" });
  res.json(new ApiResponse(200, { user: serializePublicUser(result.user), token: result.token }, "Logged in"));
});
