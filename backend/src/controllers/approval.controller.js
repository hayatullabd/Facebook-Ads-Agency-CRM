import { decideUser, decideWorkspace, listPendingUsers, listPendingWorkspaces } from "../services/approval.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { serializePublicUser } from "../utils/serializePublicUser.js";

export const getPendingWorkspaces = asyncHandler(async (_req, res) => {
  res.json(new ApiResponse(200, await listPendingWorkspaces()));
});

const handleWorkspaceDecision = (decision) => asyncHandler(async (req, res) => {
  const resolvedDecision = decision || req.body.decision;
  const workspace = await decideWorkspace(req.params.agencyId, resolvedDecision);
  res.json(new ApiResponse(200, workspace, `Workspace ${resolvedDecision}d`));
});

export const reviewWorkspace = handleWorkspaceDecision();
export const approveWorkspace = handleWorkspaceDecision("approve");
export const rejectWorkspace = handleWorkspaceDecision("reject");

export const getPendingUsers = asyncHandler(async (req, res) => {
  const users = await listPendingUsers(req.params.agencyId);
  res.json(new ApiResponse(200, users.map(serializePublicUser)));
});

const handleUserDecision = (decision) => asyncHandler(async (req, res) => {
  const resolvedDecision = decision || req.body.decision;
  const user = await decideUser({ agencyId: req.params.agencyId, userId: req.params.userId, ...req.body, decision: resolvedDecision });
  res.json(new ApiResponse(200, serializePublicUser(user), `User ${resolvedDecision}d`));
});

export const reviewUser = handleUserDecision();
export const approveUser = handleUserDecision("approve");
export const rejectUser = handleUserDecision("reject");
