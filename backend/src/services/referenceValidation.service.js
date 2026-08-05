import Client from "../models/Client.model.js";
import AdRequest from "../models/AdRequest.model.js";
import { ApiError } from "../utils/ApiError.js";
import { isObjectId } from "../validators/common.validator.js";

export const validateClientAndAdRequest = async ({ agencyId, clientId, adRequestId, required = true }) => {
  if (clientId && !isObjectId(clientId)) throw new ApiError(400, "Client is invalid");
  if (adRequestId && !isObjectId(adRequestId)) throw new ApiError(400, "Ad request is invalid");
  const [client, adRequest] = await Promise.all([
    clientId ? Client.findOne({ _id: clientId, agency: agencyId }).select("_id") : null,
    adRequestId ? AdRequest.findOne({ _id: adRequestId, agency: agencyId }).select("_id client") : null,
  ]);
  if (required && !clientId) throw new ApiError(400, "Client is required");
  if (clientId && !client) throw new ApiError(404, "Client not found");
  if (required && !adRequestId) throw new ApiError(400, "Ad request is required");
  if (adRequestId && !adRequest) throw new ApiError(404, "Ad request not found");
  if (clientId && adRequest && String(adRequest.client) !== String(clientId)) {
    throw new ApiError(400, "Ad request does not belong to this client");
  }
  return { client, adRequest };
};
