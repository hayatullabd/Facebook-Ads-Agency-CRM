import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import ApiCredential from "../models/ApiCredential.model.js";
import FacebookSyncJob from "../models/FacebookSyncJob.model.js";
import { ApiError } from "../utils/ApiError.js";
import { discoverFacebookAdAccounts, syncFacebookAccount } from "./facebookOverview.service.js";

const ACTIVE = ["queued", "running"];
const TERMINAL = ["success", "partial", "failed"];
const workerId = randomUUID();
let stopping = true;
let timer = null;
let currentRun = null;

class LeaseLostError extends Error {}

function safeError(error, fallback = "Facebook sync failed") {
  const category = typeof error?.category === "string" ? error.category : "request";
  return { message: error instanceof ApiError ? error.message : fallback, category, retryable: ["temporary", "timeout", "rate-limit"].includes(category) };
}

export function recomputeProgress(accounts) {
  const total = accounts.length;
  const completed = accounts.filter((item) => ["success", "failed"].includes(item.status)).length;
  const succeeded = accounts.filter((item) => item.status === "success").length;
  const failed = accounts.filter((item) => item.status === "failed").length;
  return { total, completed, succeeded, failed, percent: total ? Math.round((completed / total) * 100) : 0 };
}

function dto(job) {
  if (!job) return null;
  const value = job.toObject ? job.toObject() : job;
  return {
    id: String(value._id), agency: String(value.agency), provider: value.provider, kind: value.kind,
    parent: value.parent ? String(value.parent) : null, status: value.status, stage: value.stage,
    progress: value.progress, accounts: value.accounts, error: value.error || null,
    requestedBy: String(value.requestedBy), createdAt: value.createdAt, startedAt: value.startedAt,
    completedAt: value.completedAt, updatedAt: value.updatedAt,
  };
}

function wakeWorker(delay = 0) {
  if (stopping || timer || currentRun) return;
  timer = setTimeout(() => {
    timer = null;
    const run = runLoop().catch((error) => console.error("Facebook sync worker error:", error?.message || "unknown error"));
    currentRun = run;
    void run.finally(() => {
      if (currentRun === run) currentRun = null;
      if (!stopping) wakeWorker(env.facebookSyncWorkerPollMs);
    });
  }, delay);
  timer.unref?.();
}

export async function enqueueFacebookSync(agency, requestedBy) {
  const lockKey = "facebook:sync";
  try {
    const job = await FacebookSyncJob.create({ agency, requestedBy, kind: "full", lockKey });
    wakeWorker();
    return { job: dto(job), existing: false };
  } catch (error) {
    if (error?.code !== 11000) throw error;
    const existing = await FacebookSyncJob.findOne({ agency, lockKey, status: { $in: ACTIVE } });
    if (!existing) throw error;
    wakeWorker();
    return { job: dto(existing), existing: true };
  }
}

export async function enqueueFacebookAccountRetry(agency, parentId, accountId, requestedBy) {
  const active = await FacebookSyncJob.findOne({ agency, status: { $in: ACTIVE } }).select("_id");
  if (active) throw new ApiError(409, "Another Facebook sync job is already active");
  const parent = await FacebookSyncJob.findOne({ _id: parentId, agency, status: { $in: TERMINAL } });
  if (!parent) throw new ApiError(404, "Facebook sync job not found");
  const account = parent.accounts.find((item) => item.accountId === accountId);
  if (!account) throw new ApiError(404, "Facebook account diagnostic not found");
  if (account.status !== "failed" || !account.error?.retryable) throw new ApiError(409, "This Facebook account failure cannot be retried");
  const credential = await ApiCredential.findOne({ agency });
  const snapshot = credential?.adAccounts?.find((item) => item.facebookAdAccountId === accountId);
  if (!snapshot) throw new ApiError(409, "Facebook account is no longer in the current account snapshot");
  const lockKey = "facebook:sync";
  try {
    const job = await FacebookSyncJob.create({
      agency, requestedBy, kind: "retry", parent: parent._id, lockKey,
      accounts: [{ accountId, name: snapshot.name || account.name, currency: snapshot.currency || account.currency, status: "pending" }],
      progress: { total: 1, completed: 0, succeeded: 0, failed: 0, percent: 0 },
    });
    wakeWorker();
    return dto(job);
  } catch (error) {
    if (error?.code === 11000) throw new ApiError(409, "A retry for this Facebook account is already active");
    throw error;
  }
}

async function claimJob() {
  const now = new Date();
  const leaseToken = randomUUID();
  return FacebookSyncJob.findOneAndUpdate(
    { $or: [{ status: "queued" }, { status: "running", leaseExpiresAt: { $lte: now } }] },
    [{ $set: {
      status: "running", leaseOwner: workerId, leaseToken,
      claimVersion: { $add: [{ $ifNull: ["$claimVersion", 0] }, 1] },
      leaseExpiresAt: new Date(now.getTime() + env.facebookSyncLeaseMs), heartbeatAt: now,
      startedAt: { $ifNull: ["$startedAt", now] },
      accounts: { $map: { input: "$accounts", as: "account", in: { $cond: [{ $eq: ["$$account.status", "running"] }, { $mergeObjects: ["$$account", { status: "pending" }] }, "$$account"] } } },
    } }],
    { new: true, sort: { createdAt: 1 } },
  );
}

function leaseFilter(job, requireUnexpired = true) {
  const filter = { _id: job._id, status: "running", leaseOwner: workerId, leaseToken: job.leaseToken };
  if (requireUnexpired) filter.leaseExpiresAt = { $gt: new Date() };
  return filter;
}

async function fencedUpdate(job, update, options = {}) {
  const updated = await FacebookSyncJob.findOneAndUpdate(leaseFilter(job), update, { new: true, ...options });
  if (!updated) throw new LeaseLostError("Facebook sync lease lost");
  return updated;
}

async function heartbeat(job, leaseState) {
  const result = await FacebookSyncJob.updateOne(
    leaseFilter(job),
    { $set: { heartbeatAt: new Date(), leaseExpiresAt: new Date(Date.now() + env.facebookSyncLeaseMs) } },
  );
  if (result.modifiedCount !== 1) {
    leaseState.lost = true;
    throw new LeaseLostError("Facebook sync lease lost");
  }
}

async function execute(initialJob, leaseState) {
  let job = initialJob;
  const credential = await ApiCredential.findOne({ agency: job.agency }).select("+accessToken");
  const token = credential?.accessToken?.trim();
  if (!credential?.isConnected || !token || (credential.tokenExpiresAt && credential.tokenExpiresAt <= new Date())) {
    throw new ApiError(409, "Connect Facebook before starting a sync");
  }

  if (job.kind === "full" && job.accounts.length === 0) {
    job = await fencedUpdate(job, { $set: { stage: "discovery" } });
    const discovered = await discoverFacebookAdAccounts(token);
    await heartbeat(job, leaseState);
    if (!discovered.length) throw new ApiError(502, "Facebook returned no accessible ad accounts");
    const discoveredIds = new Set(discovered.map((item) => item.facebookAdAccountId));
    const inaccessible = (credential.adAccounts || []).filter((item) => !discoveredIds.has(item.facebookAdAccountId)).map((item) => ({ ...(item.toObject?.() || item), isAccessible: false }));
    await ApiCredential.updateOne({ _id: credential._id }, { $set: {
      adAccounts: [...discovered, ...inaccessible], lastAccountSyncAt: new Date(), lastVerifiedAt: new Date(),
    } });
    const accounts = discovered.map((item) => ({ accountId: item.facebookAdAccountId, name: item.name, currency: item.currency, status: "pending" }));
    job = await fencedUpdate(job, { $set: { accounts, progress: recomputeProgress(accounts) } });
  }

  job = await fencedUpdate(job, { $set: { stage: "accounts" } });
  for (const account of job.accounts) {
    if (stopping || leaseState.lost) return false;
    if (["success", "failed"].includes(account.status)) continue;
    await heartbeat(job, leaseState);
    job = await fencedUpdate(job, {
      $set: { "accounts.$[account].status": "running", "accounts.$[account].startedAt": new Date(), "accounts.$[account].completedAt": null, "accounts.$[account].error": null },
    }, { arrayFilters: [{ "account.accountId": account.accountId, "account.status": { $in: ["pending", "running"] } }] });
    const result = await syncFacebookAccount(job.agency, { facebookAdAccountId: account.accountId, name: account.name, currency: account.currency }, token);
    await heartbeat(job, leaseState);
    job = await fencedUpdate(job, {
      $set: {
        "accounts.$[account].status": result.status, "accounts.$[account].campaignCount": result.campaignCount,
        "accounts.$[account].insightCount": result.insightCount, "accounts.$[account].matchedCount": result.matchedCount,
        "accounts.$[account].modifiedCount": result.modifiedCount, "accounts.$[account].upsertedCount": result.upsertedCount,
        "accounts.$[account].staleCount": result.staleCount, "accounts.$[account].error": result.error || null,
        "accounts.$[account].completedAt": new Date(),
      },
    }, { arrayFilters: [{ "account.accountId": account.accountId, "account.status": "running" }] });
    job = await fencedUpdate(job, { $set: { progress: recomputeProgress(job.accounts) } });
  }

  if (stopping || leaseState.lost) return false;
  const progress = recomputeProgress(job.accounts);
  const status = progress.failed === 0 ? "success" : progress.succeeded > 0 ? "partial" : "failed";
  const now = new Date();
  await fencedUpdate(job, { $set: {
    status, stage: "complete", progress: { ...progress, percent: 100 }, completedAt: now,
    expiresAt: new Date(now.getTime() + env.facebookSyncRetentionDays * 86400000),
    leaseOwner: null, leaseToken: null, leaseExpiresAt: null, heartbeatAt: null,
  } });
  await ApiCredential.updateOne({ _id: credential._id }, { $set: { lastSyncAt: now, lastSyncStatus: status } });
  return true;
}

async function failJob(job, error) {
  const current = await FacebookSyncJob.findOne(leaseFilter(job));
  if (!current) return false;
  const now = new Date();
  const result = await FacebookSyncJob.updateOne(leaseFilter(job), { $set: {
    status: "failed", stage: "complete", error: safeError(error),
    progress: { ...recomputeProgress(current.accounts), percent: 100 }, completedAt: now,
    expiresAt: new Date(now.getTime() + env.facebookSyncRetentionDays * 86400000),
    leaseOwner: null, leaseToken: null, leaseExpiresAt: null, heartbeatAt: null,
  } });
  return result.modifiedCount === 1;
}

async function runLoop() {
  if (stopping) return;
  const job = await claimJob();
  if (!job) return;
  const leaseState = { lost: false };
  let heartbeatTimer = setInterval(() => void heartbeat(job, leaseState).catch((error) => {
    if (!(error instanceof LeaseLostError)) console.error("Facebook sync heartbeat failed:", error?.message || "unknown error");
  }), Math.max(1000, Math.floor(env.facebookSyncLeaseMs / 3)));
  heartbeatTimer.unref?.();
  try {
    await execute(job, leaseState);
  } catch (error) {
    if (!(error instanceof LeaseLostError) && !leaseState.lost) await failJob(job, error);
  } finally {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

export function startFacebookSyncWorker() {
  if (!stopping) return;
  stopping = false;
  wakeWorker();
}

export async function stopFacebookSyncWorker() {
  stopping = true;
  if (timer) clearTimeout(timer);
  timer = null;
  await currentRun;
}

export async function getActiveFacebookSyncJob(agency) {
  return dto(await FacebookSyncJob.findOne({ agency, status: { $in: ACTIVE } }).sort({ createdAt: -1 }));
}

export async function listFacebookSyncJobs(agency, limit) {
  const jobs = await FacebookSyncJob.find({ agency }).sort({ createdAt: -1 }).limit(limit);
  return jobs.map(dto);
}

export async function getFacebookSyncJob(agency, id) {
  return dto(await FacebookSyncJob.findOne({ _id: id, agency }));
}

export function isObjectId(value) { return mongoose.isValidObjectId(value); }
