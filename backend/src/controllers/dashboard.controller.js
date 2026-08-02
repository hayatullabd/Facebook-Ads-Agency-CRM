import AdRequest from "../models/AdRequest.model.js";
import Campaign from "../models/Campaign.model.js";
import Client from "../models/Client.model.js";
import Invoice from "../models/Invoice.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getDashboardSummary = asyncHandler(async (req, res) => {
  const agency = req.params.agencyId;
  const client = ["client", "moderator"].includes(req.user.role) ? req.user.client : null;
  const scopedQuery = client ? { agency, client } : { agency };

  const [clients, requests, campaigns, invoices] = await Promise.all([
    Client.find(client ? { agency, _id: client } : { agency }),
    AdRequest.find(scopedQuery).sort({ createdAt: -1 }).limit(5),
    Campaign.find(scopedQuery),
    Invoice.find(scopedQuery),
  ]);

  const totalBilled = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const unpaid = invoices
    .filter((invoice) => invoice.status !== "Paid")
    .reduce((sum, invoice) => sum + invoice.amount, 0);

  res.json(new ApiResponse(200, {
    kpis: {
      totalBilled,
      unpaid,
      liveCampaigns: campaigns.filter((campaign) => campaign.status === "active").length,
      activeClients: clients.filter((item) => item.status === "active").length,
      totalRequests: requests.length,
    },
    recentRequests: requests,
  }));
});
