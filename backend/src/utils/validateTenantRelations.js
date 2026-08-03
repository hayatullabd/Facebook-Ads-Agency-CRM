import mongoose from "mongoose";
import Client from "../models/Client.model.js";
import AdRequest from "../models/AdRequest.model.js";
import { ApiError } from "./ApiError.js";

export function requireObjectId(value, label) {
  if (!value || !mongoose.isValidObjectId(value)) throw new ApiError(400, `${label} is invalid`);
}

export async function validateClientAndRequest({ agencyId, clientId, adRequestId, requireRequest = true }) {
  requireObjectId(clientId, "Client");
  const client = await Client.findOne({ _id: clientId, agency: agencyId }).select("_id");
  if (!client) throw new ApiError(403, "Client does not belong to this agency");

  if (!adRequestId && !requireRequest) return { client, adRequest: null };
  requireObjectId(adRequestId, "Ad request");
  const adRequest = await AdRequest.findOne({ _id: adRequestId, agency: agencyId }).select("_id client");
  if (!adRequest) throw new ApiError(403, "Ad request does not belong to this agency");
  if (String(adRequest.client) !== String(client._id)) throw new ApiError(400, "Ad request does not belong to the selected client");
  return { client, adRequest };
}
