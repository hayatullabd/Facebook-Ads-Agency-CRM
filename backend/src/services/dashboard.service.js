import AdRequest from "../models/AdRequest.model.js";
import Campaign from "../models/Campaign.model.js";
import Client from "../models/Client.model.js";
import Invoice from "../models/Invoice.model.js";
import { getClientCampaignVisibility } from "./campaignAssignment.service.js";

export const getDashboardSummaryData = async (agency, client) => {
  const linkedScope = client ? { agency, client } : { agency };
  const campaignScope = client ? await getClientCampaignVisibility(agency, client) : { agency };
  const [clients, requests, totalRequests, pendingRequests, campaigns, invoices] = await Promise.all([
    Client.find(client ? { agency, _id: client } : { agency }),
    AdRequest.find(linkedScope).sort({ createdAt: -1 }).limit(5),
    AdRequest.countDocuments(linkedScope),
    AdRequest.countDocuments({ ...linkedScope, status: "Under Review" }),
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
  const liveCampaigns = campaigns.filter((campaign) => campaign.status === "active").length;
  const activeClients = clients.filter((item) => item.status === "active").length;
  const overdueInvoices = invoices.filter((invoice) => invoice.status === "Overdue").length;
  return {
    kpis: {
      totalBilled: Object.values(billedByCurrency).reduce((sum, value) => sum + value, 0),
      unpaid: Object.values(unpaidByCurrency).reduce((sum, value) => sum + value, 0),
      totalBilledByCurrency: billedByCurrency,
      unpaidByCurrency: unpaidByCurrency,
      liveCampaigns,
      activeClients,
      totalRequests,
      pendingRequests,
      overdueInvoices,
      totalCampaigns: campaigns.length,
    },
    summary: {
      clients: { total: clients.length, active: activeClients },
      requests: { total: totalRequests, pending: pendingRequests },
      campaigns: { total: campaigns.length, active: liveCampaigns },
      invoices: { total: invoices.length, unpaid: invoices.length - invoices.filter((invoice) => invoice.status === "Paid").length, overdue: overdueInvoices },
    },
    recentRequests: requests,
  };
};
