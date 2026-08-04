import AdRequest from "../models/AdRequest.model.js";
import Campaign from "../models/Campaign.model.js";
import Client from "../models/Client.model.js";
import Invoice from "../models/Invoice.model.js";
import { getClientCampaignVisibility } from "./campaignAssignment.service.js";

export const getDashboardSummaryData = async (agency, client) => {
  const linkedScope = client ? { agency, client } : { agency };
  const campaignScope = client ? await getClientCampaignVisibility(agency, client) : { agency };
  const [clients, requests, campaigns, invoices] = await Promise.all([
    Client.find(client ? { agency, _id: client } : { agency }),
    AdRequest.find(linkedScope).sort({ createdAt: -1 }).limit(5),
    Campaign.find(campaignScope),
    Invoice.find(linkedScope),
  ]);
  return {
    kpis: {
      totalBilled: invoices.reduce((sum, invoice) => sum + invoice.amount, 0),
      unpaid: invoices.filter((invoice) => invoice.status !== "Paid").reduce((sum, invoice) => sum + invoice.amount, 0),
      liveCampaigns: campaigns.filter((campaign) => campaign.status === "active").length,
      activeClients: clients.filter((item) => item.status === "active").length,
      totalRequests: requests.length,
    },
    recentRequests: requests,
  };
};
