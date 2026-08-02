import Client from "../models/Client.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const mutableFields = [
  "name", "contactName", "email", "phone", "facebookPageName", "facebookPageId",
  "adAccountId", "status", "monthlyBudget", "billingRate", "color", "notes",
  "assignedTeamMembers",
];
const pickClientFields = (body) => Object.fromEntries(
  mutableFields.filter((field) => body[field] !== undefined).map((field) => [field, body[field]])
);

export const getClients = asyncHandler(async (req, res) => {
  const query = { agency: req.params.agencyId };
  if (["client", "moderator"].includes(req.user.role)) query._id = req.user.client;
  const clients = await Client.find(query).sort({ createdAt: -1 });
  res.json(new ApiResponse(200, clients));
});

export const createClient = asyncHandler(async (req, res) => {
  const client = await Client.create({ ...pickClientFields(req.body), agency: req.params.agencyId });
  res.status(201).json(new ApiResponse(201, client, "Client created"));
});

export const updateClient = asyncHandler(async (req, res) => {
  const client = await Client.findOneAndUpdate(
    { _id: req.params.clientId, agency: req.params.agencyId },
    pickClientFields(req.body),
    { new: true, runValidators: true }
  );
  if (!client) throw new ApiError(404, "Client not found");
  res.json(new ApiResponse(200, client, "Client updated"));
});

export const deleteClient = asyncHandler(async (req, res) => {
  const client = await Client.findOneAndDelete({ _id: req.params.clientId, agency: req.params.agencyId });
  if (!client) throw new ApiError(404, "Client not found");
  res.json(new ApiResponse(200, null, "Client deleted"));
});
