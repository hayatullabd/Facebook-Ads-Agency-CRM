import Agency from "../models/Agency.model.js";
import Client from "../models/Client.model.js";
import User from "../models/User.model.js";
import { deleteClientAndDetachFacebookCampaigns, setClientAdAccountAssignment } from "../services/campaignAssignment.service.js";
import { getPasswordPolicyError } from "../services/passwordPolicy.service.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const mutableFields = [
  "name", "contactName", "email", "phone", "facebookPageName", "facebookPageId",
  "adAccountId", "status", "monthlyBudget", "billingRate", "billingCurrency", "color", "notes",
  "assignedTeamMembers",
];
const pickClientFields = (body) => Object.fromEntries(
  mutableFields.filter((field) => body[field] !== undefined).map((field) => [field, body[field]])
);

const syncClientLogin = async ({ agencyId, client, password }) => {
  const email = client.email.trim().toLowerCase();
  const name = client.contactName.trim();
  let login = await User.findOne({ agency: agencyId, client: client._id, role: "client" });
  if (!login && !password) return;
  if (password) {
    const passwordError = getPasswordPolicyError(password);
    if (passwordError) throw new ApiError(400, passwordError);
  }
  if (!login) {
    login = new User({ agency: agencyId, client: client._id, role: "client", status: "active", isActive: true, platformRole: "user" });
  }
  login.name = name;
  login.email = email;
  login.status = "active";
  login.isActive = true;
  if (password) login.password = password;
  try {
    await login.save();
  } catch (error) {
    if (error?.code === 11000) throw new ApiError(409, "An account with this email already exists");
    throw error;
  }
};

export const getClients = asyncHandler(async (req, res) => {
  const query = { agency: req.params.agencyId };
  if (["client", "moderator"].includes(req.user.role)) query._id = req.user.client;
  const clients = await Client.find(query).sort({ createdAt: -1 }).limit(3000).lean();
  res.json(new ApiResponse(200, clients));
});

export const createClient = asyncHandler(async (req, res) => {
  const agency = await Agency.findById(req.params.agencyId).select("subscriptionPlan").populate("subscriptionPlan", "name limits");
  const cap = Number(agency?.subscriptionPlan?.limits?.clients) || 0;
  if (cap > 0) {
    const used = await Client.countDocuments({ agency: req.params.agencyId });
    if (used >= cap) throw new ApiError(403, `${agency.subscriptionPlan.name} allows ${cap} clients`);
  }
  const passwordError = getPasswordPolicyError(req.body.password);
  if (passwordError) throw new ApiError(400, passwordError);
  const client = await Client.create({ ...pickClientFields(req.body), agency: req.params.agencyId });
  try {
    await syncClientLogin({ agencyId: req.params.agencyId, client, password: req.body.password });
  } catch (error) {
    await Client.deleteOne({ _id: client._id });
    throw error;
  }
  res.status(201).json(new ApiResponse(201, client, "Client created"));
});

export const updateClient = asyncHandler(async (req, res) => {
  const previous = await Client.findOne({ _id: req.params.clientId, agency: req.params.agencyId }).select("email contactName");
  const client = await Client.findOneAndUpdate(
    { _id: req.params.clientId, agency: req.params.agencyId },
    pickClientFields(req.body),
    { new: true, runValidators: true }
  );
  if (!client) throw new ApiError(404, "Client not found");
  const password = typeof req.body.password === "string" && req.body.password.trim() ? req.body.password : "";
  try {
    await syncClientLogin({ agencyId: req.params.agencyId, client, password });
  } catch (error) {
    if (previous) await Client.updateOne({ _id: previous._id }, { email: previous.email, contactName: previous.contactName });
    throw error;
  }
  res.json(new ApiResponse(200, client, "Client updated"));
});

export const deleteClient = asyncHandler(async (req, res) => {
  await deleteClientAndDetachFacebookCampaigns(req.params.agencyId, req.params.clientId);
  res.json(new ApiResponse(200, null, "Client deleted"));
});

export const assignClientFacebookAccount = asyncHandler(async (req, res) => {
  const client = await setClientAdAccountAssignment({
    agencyId: req.params.agencyId,
    clientId: req.params.clientId,
    facebookAdAccountId: req.body.facebookAdAccountId,
    assigned: req.body.assigned,
  });
  res.json(new ApiResponse(200, client, req.body.assigned ? "Facebook ad account assigned" : "Facebook ad account unassigned"));
});
