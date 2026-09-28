import mongoose from "mongoose";
import AdRequest from "../models/AdRequest.model.js";
import Agency from "../models/Agency.model.js";
import Campaign from "../models/Campaign.model.js";
import Client from "../models/Client.model.js";
import Invoice from "../models/Invoice.model.js";
import Subscription from "../models/Subscription.model.js";
import SubscriptionPlan from "../models/SubscriptionPlan.model.js";
import { PLATFORM_ROLES } from "../constants/roles.js";
import { getClientCampaignVisibility } from "./campaignAssignment.service.js";

export const getDashboardSummaryData = async (agency, client) => {
  const agencyId = new mongoose.Types.ObjectId(String(agency));
  const clientId = client ? new mongoose.Types.ObjectId(String(client)) : null;
  const linkedScope = clientId ? { agency: agencyId, client: clientId } : { agency: agencyId };
  const visibility = clientId ? await getClientCampaignVisibility(agencyId, clientId) : null;
  const campaignScope = visibility ? { $and: [visibility, { source: "facebook" }] } : { agency: agencyId, source: "facebook" };
  const activeCampaignScope = visibility ? { $and: [visibility, { source: "facebook", status: "active" }] } : { agency: agencyId, source: "facebook", status: "active" };
  const [clientStats, recentRequests, totalRequests, pendingRequests, totalCampaigns, liveCampaigns, invoiceGroups, subscriptionStats] = await Promise.all([
    Client.aggregate([
      { $match: clientId ? { agency: agencyId, _id: clientId } : { agency: agencyId } },
      { $group: { _id: null, total: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } } } },
    ]),
    AdRequest.find(linkedScope).sort({ createdAt: -1 }).limit(5).lean(),
    AdRequest.countDocuments(linkedScope),
    AdRequest.countDocuments({ ...linkedScope, status: "Under Review" }),
    Campaign.countDocuments(campaignScope),
    Campaign.countDocuments(activeCampaignScope),
    Invoice.aggregate([
      { $match: linkedScope },
      { $group: {
        _id: { $ifNull: ["$currency", "USD"] },
        total: { $sum: "$amount" },
        unpaid: { $sum: { $cond: [{ $ne: ["$status", "Paid"] }, "$amount", 0] } },
        count: { $sum: 1 },
        paidCount: { $sum: { $cond: [{ $eq: ["$status", "Paid"] }, 1, 0] } },
        overdue: { $sum: { $cond: [{ $eq: ["$status", "Overdue"] }, 1, 0] } },
      } },
    ]),
    Subscription.aggregate([
      { $match: { agency: agencyId } },
      { $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
        pastDue: { $sum: { $cond: [{ $eq: ["$status", "past_due"] }, 1, 0] } },
      } },
    ]),
  ]);
  const clients = clientStats[0] || { total: 0, active: 0 };
  const subscriptions = subscriptionStats[0] || { total: 0, active: 0, pastDue: 0 };
  const billedByCurrency = {};
  const unpaidByCurrency = {};
  let invoiceCount = 0;
  let paidInvoices = 0;
  let overdueInvoices = 0;
  invoiceGroups.forEach((group) => {
    billedByCurrency[group._id] = group.total;
    unpaidByCurrency[group._id] = group.unpaid;
    invoiceCount += group.count;
    paidInvoices += group.paidCount;
    overdueInvoices += group.overdue;
  });
  return {
    kpis: {
      totalBilled: Object.values(billedByCurrency).reduce((sum, value) => sum + value, 0),
      unpaid: Object.values(unpaidByCurrency).reduce((sum, value) => sum + value, 0),
      totalBilledByCurrency: billedByCurrency,
      unpaidByCurrency: unpaidByCurrency,
      liveCampaigns,
      activeClients: clients.active,
      totalRequests,
      pendingRequests,
      overdueInvoices,
      activeSubscriptions: subscriptions.active,
      pastDueSubscriptions: subscriptions.pastDue,
      totalCampaigns,
    },
    summary: {
      clients: { total: clients.total, active: clients.active },
      requests: { total: totalRequests, pending: pendingRequests },
      campaigns: { total: totalCampaigns, active: liveCampaigns },
      invoices: { total: invoiceCount, unpaid: invoiceCount - paidInvoices, overdue: overdueInvoices },
      subscriptions: { total: subscriptions.total, active: subscriptions.active, pastDue: subscriptions.pastDue },
    },
    recentRequests,
  };
};

const workspaceStatus = (agency) => agency.status || "active";

const serializeWorkspace = (agency) => ({
  _id: agency._id,
  name: agency.name,
  status: workspaceStatus(agency),
  subscriptionStatus: agency.subscriptionStatus || "trialing",
  renewalAt: agency.subscriptionRenewalAt,
  planName: agency.subscriptionPlan?.name || "No plan",
  planPrice: agency.subscriptionPlan?.price ?? null,
  planCurrency: agency.subscriptionPlan?.currency || "USD",
  clientLimit: Number(agency.subscriptionPlan?.limits?.clients) || 0,
  clientCount: agency.clientCount || 0,
  ownerName: agency.owner?.name || "—",
  ownerEmail: agency.owner?.email || "",
  createdAt: agency.createdAt,
});

export const getPlatformDashboardData = async () => {
  const [agencies, plans] = await Promise.all([
    Agency.find()
      .select("name status subscriptionStatus subscriptionRenewalAt createdAt owner subscriptionPlan")
      .populate("owner", "name email platformRole")
      .populate("subscriptionPlan", "name price currency limits")
      .sort({ createdAt: -1 })
      .lean(),
    SubscriptionPlan.countDocuments({ isActive: true }),
  ]);
  const customers = agencies.filter((agency) => agency.owner?.platformRole !== PLATFORM_ROLES.ADMIN);
  const clientCounts = await Client.aggregate([
    { $match: { agency: { $in: customers.map((agency) => agency._id) } } },
    { $group: { _id: "$agency", count: { $sum: 1 } } },
  ]);
  const countByAgency = new Map(clientCounts.map((row) => [String(row._id), row.count]));
  customers.forEach((agency) => { agency.clientCount = countByAgency.get(String(agency._id)) || 0; });
  const countStatus = (status) => customers.filter((agency) => workspaceStatus(agency) === status).length;
  const countSubscription = (status) => customers.filter((agency) => (agency.subscriptionStatus || "trialing") === status).length;
  const mrr = {};
  customers
    .filter((agency) => agency.subscriptionStatus === "active" && agency.subscriptionPlan)
    .forEach((agency) => {
      const currency = agency.subscriptionPlan.currency || "USD";
      mrr[currency] = (mrr[currency] || 0) + (Number(agency.subscriptionPlan.price) || 0);
    });
  const renewalCutoff = Date.now() + 14 * 24 * 60 * 60 * 1000;
  const renewals = customers
    .filter((agency) => agency.subscriptionStatus === "active" && agency.subscriptionRenewalAt && new Date(agency.subscriptionRenewalAt).getTime() <= renewalCutoff)
    .sort((left, right) => new Date(left.subscriptionRenewalAt) - new Date(right.subscriptionRenewalAt))
    .slice(0, 6)
    .map(serializeWorkspace);

  return {
    kpis: {
      activeWorkspaces: countStatus("active"),
      pendingWorkspaces: countStatus("pending"),
      suspendedWorkspaces: countStatus("suspended") + countStatus("rejected"),
      activeSubscriptions: countSubscription("active"),
      trialingSubscriptions: countSubscription("trialing"),
      pastDueSubscriptions: countSubscription("past_due"),
      plans,
      mrr,
    },
    pending: customers.filter((agency) => workspaceStatus(agency) === "pending").map(serializeWorkspace),
    attention: customers.filter((agency) => ["past_due", "paused", "expired"].includes(agency.subscriptionStatus)).slice(0, 6).map(serializeWorkspace),
    renewals,
    recent: customers.slice(0, 8).map(serializeWorkspace),
    agencies: customers.map(serializeWorkspace),
  };
};
