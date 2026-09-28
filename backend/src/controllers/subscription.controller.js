import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { assignSubscriptionPlan, cancelSubscription, createSubscription, createSubscriptionInvoice, createSubscriptionPlan, deleteSubscriptionInvoice, deleteSubscriptionPlan, getSubscriptionSummary, listSubscriptionInvoices, listSubscriptionPlans, listSubscriptions, markSubscriptionInvoicePaid, resumeSubscription, updateSubscriptionPlan } from "../services/subscription.service.js";

export const getPlans = asyncHandler(async (_req, res) => {
  res.json(new ApiResponse(200, await listSubscriptionPlans()));
});

export const createPlan = asyncHandler(async (req, res) => {
  const plan = await createSubscriptionPlan(req.body);
  res.status(201).json(new ApiResponse(201, plan, "Subscription plan created"));
});

export const updatePlan = asyncHandler(async (req, res) => {
  const plan = await updateSubscriptionPlan(req.params.planId, req.body);
  res.json(new ApiResponse(200, plan, "Subscription plan updated"));
});

export const removePlan = asyncHandler(async (req, res) => {
  await deleteSubscriptionPlan(req.params.planId);
  res.json(new ApiResponse(200, null, "Subscription plan deleted"));
});

export const getSubscriptionInvoices = asyncHandler(async (_req, res) => {
  res.json(new ApiResponse(200, await listSubscriptionInvoices()));
});

export const addSubscriptionInvoice = asyncHandler(async (req, res) => {
  const invoice = await createSubscriptionInvoice(req.body);
  res.status(201).json(new ApiResponse(201, invoice, "Invoice created"));
});

export const collectSubscriptionInvoice = asyncHandler(async (req, res) => {
  const invoice = await markSubscriptionInvoicePaid(req.params.invoiceId);
  res.json(new ApiResponse(200, invoice, "Invoice marked paid"));
});

export const removeSubscriptionInvoice = asyncHandler(async (req, res) => {
  await deleteSubscriptionInvoice(req.params.invoiceId);
  res.json(new ApiResponse(200, null, "Invoice deleted"));
});

export const getSubscriptions = asyncHandler(async (req, res) => {
  res.json(new ApiResponse(200, await listSubscriptions(req.params.agencyId)));
});

export const createAgencySubscription = asyncHandler(async (req, res) => {
  const subscription = await createSubscription({ agencyId: req.params.agencyId, planId: req.body.plan, actor: req.user });
  res.status(201).json(new ApiResponse(201, subscription, "Subscription created"));
});

export const cancelAgencySubscription = asyncHandler(async (req, res) => {
  const subscription = await cancelSubscription(req.params.agencyId, req.params.subscriptionId);
  res.json(new ApiResponse(200, subscription, "Subscription canceled"));
});

export const resumeAgencySubscription = asyncHandler(async (req, res) => {
  const subscription = await resumeSubscription(req.params.agencyId, req.params.subscriptionId);
  res.json(new ApiResponse(200, subscription, "Subscription resumed"));
});

export const assignAgencySubscriptionPlan = asyncHandler(async (req, res) => {
  const subscription = await assignSubscriptionPlan({ agencyId: req.params.agencyId, subscriptionId: req.params.subscriptionId, planId: req.body.plan });
  res.json(new ApiResponse(200, subscription, "Subscription plan assigned"));
});

export const getSubscriptionDashboard = asyncHandler(async (req, res) => {
  res.json(new ApiResponse(200, await getSubscriptionSummary(req.params.agencyId)));
});
