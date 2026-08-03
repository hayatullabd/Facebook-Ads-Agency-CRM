import ActivityLog from "../models/ActivityLog.model.js";
import AdRequest from "../models/AdRequest.model.js";
import Campaign from "../models/Campaign.model.js";
import Client from "../models/Client.model.js";
import ClientUpdate from "../models/ClientUpdate.model.js";
import Invoice from "../models/Invoice.model.js";
import { ensureLiveRequestInvoice } from "./invoice.service.js";
import { ApiError } from "../utils/ApiError.js";

const CLIENT_ROLES = ["client", "moderator"];
const EDITABLE_STATUSES = ["Under Review", "Rejected"];
const BRIEF_FIELDS = ["pageName", "platform", "objectiveGroup", "objective", "budget", "durationDays", "notes", "contentLink"];
const POPULATE = [
  { path: "client", select: "name contactName" },
  { path: "submittedBy", select: "name" },
  { path: "reviewedBy", select: "name" },
];

const isClientRole = (role) => CLIENT_ROLES.includes(role);
const pickBriefFields = (body) => Object.fromEntries(BRIEF_FIELDS.filter((field) => body[field] !== undefined).map((field) => [field, body[field]]));

const assertClientAccess = (request, actor) => {
  if (isClientRole(actor.role) && String(request.client?._id || request.client) !== String(actor.client?._id || actor.client)) {
    throw new ApiError(403, "You do not have access to this ad request");
  }
};

export const findScopedAdRequest = async ({ agencyId, requestId, actor, populate = false }) => {
  let query = AdRequest.findOne({ _id: requestId, agency: agencyId });
  if (populate) query = query.populate(POPULATE);
  const request = await query;
  if (!request) throw new ApiError(404, "Ad request not found");
  assertClientAccess(request, actor);
  return request;
};

const getLinkedTypes = async ({ agencyId, requestId }) => {
  const [campaign, invoice, clientUpdate] = await Promise.all([
    Campaign.exists({ agency: agencyId, adRequest: requestId }),
    Invoice.exists({ agency: agencyId, adRequest: requestId }),
    ClientUpdate.exists({ agency: agencyId, adRequest: requestId }),
  ]);
  return [campaign && "Campaign", invoice && "Invoice", clientUpdate && "ClientUpdate"].filter(Boolean);
};

const assertUnlinked = async ({ agencyId, requestId }) => {
  const linkedTypes = await getLinkedTypes({ agencyId, requestId });
  if (linkedTypes.length) throw new ApiError(409, `Ad request is linked to ${linkedTypes.join(", ")} and cannot be changed this way`);
};

const assertSameAgencyClient = async (agencyId, clientId) => {
  const client = await Client.exists({ _id: clientId, agency: agencyId });
  if (!client) throw new ApiError(400, "Client does not belong to this agency");
};

const createActivity = ({ request, actorId, action, detail, metadata = {} }) => ActivityLog.create({
  agency: request.agency,
  actor: actorId,
  client: request.client,
  adRequest: request._id,
  entityType: "ad_request",
  entityId: request._id,
  action,
  detail,
  metadata,
});

export const recordAdRequestCreated = async ({ request, actorId }) => {
  await createActivity({ request, actorId, action: "created", detail: `Ad request ${request.requestNumber} created` });
};

export const getAdRequestDetails = (options) => findScopedAdRequest({ ...options, populate: true });

export const getAdRequestActivity = async ({ agencyId, requestId, actor }) => {
  const request = await findScopedAdRequest({ agencyId, requestId, actor });
  return ActivityLog.find({ agency: agencyId, entityType: "ad_request", entityId: request._id })
    .populate({ path: "actor", select: "name" })
    .sort({ createdAt: -1 });
};

export const updateAdRequest = async ({ agencyId, requestId, actor, updates }) => {
  const request = await findScopedAdRequest({ agencyId, requestId, actor });
  const clientActor = isClientRole(actor.role);
  if (clientActor && !EDITABLE_STATUSES.includes(request.status)) throw new ApiError(403, "Clients and moderators may edit only Under Review or Rejected requests");

  const clientChanged = updates.client !== undefined && String(updates.client) !== String(request.client);
  if (clientChanged) {
    if (clientActor) throw new ApiError(403, "You cannot reassign this request");
    if (request.status === "Live") throw new ApiError(409, "A Live request cannot be reassigned");
    await assertUnlinked({ agencyId, requestId });
    await assertSameAgencyClient(agencyId, updates.client);
    request.client = updates.client;
  }

  const changedFields = [];
  for (const [field, value] of Object.entries(pickBriefFields(updates))) { request.set(field, value); changedFields.push(field); }
  if (clientChanged) { request.client = updates.client; changedFields.push("client"); }

  const resubmitted = request.status === "Rejected" && clientActor;
  if (resubmitted) {
    request.status = "Under Review";
    request.rejectionReason = "";
    request.agencyNote = "";
    request.reviewedBy = null;
    request.reviewedAt = null;
    request.approvedAt = null;
    request.launchedAt = null;
  }
  await request.save();
  await createActivity({ request, actorId: actor._id, action: resubmitted ? "resubmitted" : "edited", detail: resubmitted ? `Ad request ${request.requestNumber} edited and resubmitted` : `Ad request ${request.requestNumber} edited`, metadata: { changedFields } });
  return getAdRequestDetails({ agencyId, requestId, actor });
};

export const deleteAdRequest = async ({ agencyId, requestId, actor }) => {
  const request = await findScopedAdRequest({ agencyId, requestId, actor });
  const clientActor = isClientRole(actor.role);
  if ((clientActor || actor.role === "team") && !EDITABLE_STATUSES.includes(request.status)) throw new ApiError(403, "This role may delete only Under Review or Rejected requests");
  await assertUnlinked({ agencyId, requestId });
  await createActivity({ request, actorId: actor._id, action: "deleted", detail: `Ad request ${request.requestNumber} deleted`, metadata: { requestNumber: request.requestNumber, status: request.status, client: String(request.client) } });
  await AdRequest.deleteOne({ _id: request._id, agency: agencyId });
};

const VALID_TRANSITIONS = { "Under Review": ["Approved", "Rejected"], Approved: ["Live"], Live: [], Rejected: [] };

export const transitionAdRequestStatus = async ({ agencyId, requestId, actor, status, agencyNote = "", rejectionReason = "" }) => {
  const request = await findScopedAdRequest({ agencyId, requestId, actor });
  if (request.status === status) throw new ApiError(400, "Request already has this status");
  if (!VALID_TRANSITIONS[request.status]?.includes(status)) throw new ApiError(409, `Cannot change request status from ${request.status} to ${status}`);
  if (status === "Rejected" && !rejectionReason.trim()) throw new ApiError(400, "rejectionReason is required when rejecting a request");

  const now = new Date();
  request.status = status;
  request.agencyNote = agencyNote;
  request.rejectionReason = status === "Rejected" ? rejectionReason : "";
  request.reviewedBy = actor._id;
  request.reviewedAt = now;
  if (status === "Approved") request.approvedAt = now;
  if (status === "Live") request.launchedAt = now;
  await request.save();

  const invoiceResult = status === "Live" ? await ensureLiveRequestInvoice({ request }) : null;
  await createActivity({ request, actorId: actor._id, action: "status_changed", detail: `Request status changed to ${status}`, metadata: { status, invoiceId: invoiceResult?.invoice?._id, invoiceCreated: invoiceResult?.created ?? false } });
  return getAdRequestDetails({ agencyId, requestId, actor });
};

export const validateRequestClient = assertSameAgencyClient;
