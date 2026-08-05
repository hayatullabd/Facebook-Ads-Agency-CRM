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
  const totalsByCurrency = (items, predicate = () => true) => items.filter(predicate).reduce((totals, item) => {
    const currency = item.currency || item.budget?.currency || "USD";
    totals[currency] = (totals[currency] || 0) + item.amount;
    return totals;
  }, {});
  const billedByCurrency = totalsByCurrency(invoices);
  const unpaidByCurrency = totalsByCurrency(invoices, (invoice) => invoice.status !== "Paid");
  return {
    kpis: {
      totalBilled: Object.values(billedByCurrency).reduce((sum, value) => sum + value, 0),
      unpaid: Object.values(unpaidByCurrency).reduce((sum, value) => sum + value, 0),
      totalBilledByCurrency: billedByCurrency,
      unpaidByCurrency: unpaidByCurrency,
      liveCampaigns: campaigns.filter((campaign) => campaign.status === "active").length,
      activeClients: clients.filter((item) => item.status === "active").length,
      totalRequests: requests.length,
    },
    recentRequests: requests,
  };
};
