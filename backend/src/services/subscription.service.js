import Agency from "../models/Agency.model.js";
import Subscription from "../models/Subscription.model.js";
import SubscriptionInvoice from "../models/SubscriptionInvoice.model.js";
import SubscriptionPlan from "../models/SubscriptionPlan.model.js";
import { ApiError } from "../utils/ApiError.js";

const MONTH_IN_MS = 30 * 24 * 60 * 60 * 1000;

export const listSubscriptionPlans = () => SubscriptionPlan.find({ isActive: true }).sort({ price: 1 });

export const createSubscriptionPlan = (payload) => SubscriptionPlan.create(payload);

export const updateSubscriptionPlan = async (planId, updates) => {
  const plan = await SubscriptionPlan.findByIdAndUpdate(planId, updates, { new: true, runValidators: true });
  if (!plan) throw new ApiError(404, "Subscription plan not found");
  return plan;
};

export const deleteSubscriptionPlan = async (planId) => {
  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) throw new ApiError(404, "Subscription plan not found");
  const assigned = await Agency.exists({ subscriptionPlan: plan._id });
  if (assigned) throw new ApiError(409, "This plan is assigned to an agency");
  await plan.deleteOne();
  return plan;
};

export const listSubscriptions = (agencyId) => Subscription.find({ agency: agencyId }).populate("plan").sort({ createdAt: -1 });

export const createSubscription = async ({ agencyId, planId, actor }) => {
  const agency = await Agency.findById(agencyId);
  if (!agency) throw new ApiError(404, "Agency not found");
  const plan = await SubscriptionPlan.findById(planId);
  if (!plan || !plan.isActive) throw new ApiError(404, "Subscription plan not found");
  const existing = await Subscription.findOne({ agency: agency._id, status: "active" });
  if (existing) throw new ApiError(409, "Agency already has an active subscription");
  const now = new Date();
  const renewalAt = new Date(now.getTime() + MONTH_IN_MS);
  const subscription = await Subscription.create({ agency: agency._id, plan: plan._id, status: "active", startAt: now, currentPeriodStart: now, currentPeriodEnd: renewalAt, renewalAt, autoRenew: true, notes: `Created by ${actor?.name || "system"}` });
  agency.subscription = subscription._id;
  agency.subscriptionPlan = plan._id;
  agency.subscriptionStatus = subscription.status;
  agency.subscriptionRenewalAt = renewalAt;
  await agency.save();
  return subscription.populate("plan");
};

export const assignSubscriptionPlan = async ({ agencyId, subscriptionId, planId }) => {
  const subscription = await Subscription.findOne({ _id: subscriptionId, agency: agencyId });
  if (!subscription) throw new ApiError(404, "Subscription not found");
  const plan = await SubscriptionPlan.findById(planId);
  if (!plan || !plan.isActive) throw new ApiError(404, "Subscription plan not found");
  subscription.plan = plan._id;
  await subscription.save();
  await Agency.findByIdAndUpdate(agencyId, { subscriptionPlan: plan._id });
  return subscription.populate("plan");
};

export const renewSubscriptions = async () => {
  const due = await Subscription.find({ status: "active", autoRenew: { $ne: false }, renewalAt: { $lte: new Date() } }).populate("plan");
  const results = [];
  for (const subscription of due) {
    if (!subscription.plan?._id) continue;
    subscription.currentPeriodStart = new Date();
    subscription.currentPeriodEnd = new Date(Date.now() + MONTH_IN_MS);
    subscription.renewalAt = new Date(Date.now() + MONTH_IN_MS);
    await subscription.save();
    await Agency.findByIdAndUpdate(subscription.agency, { subscriptionRenewalAt: subscription.renewalAt, subscriptionStatus: subscription.status, subscriptionPlan: subscription.plan._id, subscription: subscription._id });
    results.push(subscription);
  }
  return results;
};

export const cancelSubscription = async (agencyId, subscriptionId) => {
  const subscription = await Subscription.findOne({ _id: subscriptionId, agency: agencyId });
  if (!subscription) throw new ApiError(404, "Subscription not found");
  subscription.status = "canceled";
  subscription.cancelAtPeriodEnd = true;
  subscription.autoRenew = false;
  await subscription.save();
  await Agency.findByIdAndUpdate(agencyId, { subscriptionStatus: subscription.status });
  return subscription.populate("plan");
};

export const resumeSubscription = async (agencyId, subscriptionId) => {
  const subscription = await Subscription.findOne({ _id: subscriptionId, agency: agencyId });
  if (!subscription) throw new ApiError(404, "Subscription not found");
  if (subscription.status === "active") return subscription.populate("plan");
  subscription.status = "active";
  subscription.cancelAtPeriodEnd = false;
  subscription.autoRenew = true;
  subscription.renewalAt = new Date(Date.now() + MONTH_IN_MS);
  subscription.currentPeriodEnd = subscription.renewalAt;
  await subscription.save();
  await Agency.findByIdAndUpdate(agencyId, { subscriptionStatus: subscription.status, subscriptionRenewalAt: subscription.renewalAt });
  return subscription.populate("plan");
};

const invoiceStatus = (invoice) => invoice.status === "Paid" ? "Paid" : new Date(invoice.dueDate).getTime() < Date.now() ? "Overdue" : "Unpaid";

const serializeInvoice = (invoice) => ({
  _id: invoice._id,
  invoiceNumber: invoice.invoiceNumber,
  agencyId: invoice.agency?._id || invoice.agency,
  agencyName: invoice.agency?.name || "Agency",
  amount: invoice.amount,
  currency: invoice.currency,
  status: invoiceStatus(invoice),
  dueDate: invoice.dueDate,
  paidAt: invoice.paidAt,
  note: invoice.note || "",
});

const nextInvoiceNumber = async () => {
  const count = await SubscriptionInvoice.countDocuments();
  for (let offset = 1; offset <= 5; offset += 1) {
    const invoiceNumber = `BILL-${String(count + offset).padStart(4, "0")}`;
    const exists = await SubscriptionInvoice.exists({ invoiceNumber });
    if (!exists) return invoiceNumber;
  }
  return `BILL-${Date.now()}`;
};

export const listSubscriptionInvoices = async () => {
  const invoices = await SubscriptionInvoice.find().populate("agency", "name").sort({ createdAt: -1 }).lean();
  return invoices.map(serializeInvoice);
};

export const createSubscriptionInvoice = async ({ agency: agencyId, amount, currency, dueDate, note }) => {
  const agency = await Agency.findById(agencyId).select("name");
  if (!agency) throw new ApiError(404, "Agency not found");
  const invoice = await SubscriptionInvoice.create({
    agency: agency._id,
    invoiceNumber: await nextInvoiceNumber(),
    amount,
    currency,
    dueDate: new Date(dueDate),
    note: note || "",
  });
  invoice.agency = agency;
  return serializeInvoice(invoice);
};

export const markSubscriptionInvoicePaid = async (invoiceId) => {
  const invoice = await SubscriptionInvoice.findById(invoiceId).populate("agency", "name");
  if (!invoice) throw new ApiError(404, "Invoice not found");
  if (invoice.status === "Paid") throw new ApiError(409, "Invoice is already paid");
  invoice.status = "Paid";
  invoice.paidAt = new Date();
  await invoice.save();
  return serializeInvoice(invoice);
};

export const deleteSubscriptionInvoice = async (invoiceId) => {
  const invoice = await SubscriptionInvoice.findByIdAndDelete(invoiceId);
  if (!invoice) throw new ApiError(404, "Invoice not found");
  return invoice;
};

export const getSubscriptionDashboard = async (agencyId) => {
  const subscriptions = await listSubscriptions(agencyId);
  const active = subscriptions.filter((subscription) => subscription.status === "active").length;
  const expiringSoon = subscriptions.filter((subscription) => subscription.renewalAt && subscription.renewalAt.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000).length;
  const pastDue = subscriptions.filter((subscription) => subscription.status === "past_due").length;
  return { subscriptions, active, expiringSoon, pastDue };
};

export const getSubscriptionSummary = async (agencyId) => getSubscriptionDashboard(agencyId);
