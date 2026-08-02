import ApiCredential from "../models/ApiCredential.model.js";
import AdRequest from "../models/AdRequest.model.js";
import ClientUpdate from "../models/ClientUpdate.model.js";
import Invoice from "../models/Invoice.model.js";
import User from "../models/User.model.js";
import Campaign from "../models/Campaign.model.js";
import Client from "../models/Client.model.js";
import { ApiError } from "../utils/ApiError.js";

export async function getClientCampaignVisibility(agencyId, clientId) {
  const client = await Client.findOne({ _id: clientId, agency: agencyId }).select("facebookAdAccountIds");
  const assignedAccounts = client?.facebookAdAccountIds || [];
  return {
    agency: agencyId,
    $or: [
      { client: clientId },
      { facebookAdAccountId: { $in: assignedAccounts } },
    ],
  };
}

export async function setClientAdAccountAssignment({ agencyId, clientId, facebookAdAccountId, assigned }) {
  const [client, credential] = await Promise.all([
    Client.findOne({ _id: clientId, agency: agencyId }),
    ApiCredential.findOne({ agency: agencyId }).select("adAccounts"),
  ]);
  if (!client) throw new ApiError(404, "Client not found");
  if (!credential?.adAccounts?.some((account) => account.facebookAdAccountId === facebookAdAccountId)) {
    throw new ApiError(404, "Facebook ad account is not available for this agency");
  }

  if (assigned) {
    const owner = await Client.findOne({
      agency: agencyId,
      _id: { $ne: clientId },
      facebookAdAccountIds: facebookAdAccountId,
    }).select("_id");
    if (owner) throw new ApiError(409, "Facebook ad account is already assigned to another client");
  }

  const update = assigned
    ? { $addToSet: { facebookAdAccountIds: facebookAdAccountId } }
    : { $pull: { facebookAdAccountIds: facebookAdAccountId } };
  try {
    return await Client.findOneAndUpdate(
      { _id: clientId, agency: agencyId },
      update,
      { new: true, runValidators: true }
    );
  } catch (error) {
    if (error?.code === 11000) throw new ApiError(409, "Facebook ad account is already assigned to another client");
    throw error;
  }
}

export async function setCampaignClientAssignment({ agencyId, campaignId, clientId }) {
  if (clientId) {
    const client = await Client.findOne({ _id: clientId, agency: agencyId }).select("_id");
    if (!client) throw new ApiError(404, "Client not found");
  }

  const campaign = await Campaign.findOne({ _id: campaignId, agency: agencyId });
  if (!campaign) throw new ApiError(404, "Campaign not found");
  if (campaign.source !== "facebook") {
    throw new ApiError(400, "Only Facebook campaigns support client assignment mapping");
  }

  campaign.client = clientId || null;
  await campaign.save();
  return campaign.populate("client adRequest");
}

export async function deleteClientAndDetachFacebookCampaigns(agencyId, clientId) {
  const client = await Client.findOne({ _id: clientId, agency: agencyId }).select("_id");
  if (!client) throw new ApiError(404, "Client not found");
  const [adRequest, invoice, update, user, campaign] = await Promise.all([
    AdRequest.exists({ agency: agencyId, client: clientId }),
    Invoice.exists({ agency: agencyId, client: clientId }),
    ClientUpdate.exists({ agency: agencyId, client: clientId }),
    User.exists({ agency: agencyId, client: clientId }),
    Campaign.exists({ agency: agencyId, client: clientId }),
  ]);
  if (adRequest || invoice || update || user || campaign) {
    throw new ApiError(409, "Client cannot be deleted while linked requests, invoices, updates, users, or campaigns exist");
  }
  await Client.deleteOne({ _id: clientId, agency: agencyId });
}
