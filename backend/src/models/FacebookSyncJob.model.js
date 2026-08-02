import mongoose from "mongoose";

const errorSchema = new mongoose.Schema({
  message: { type: String, maxlength: 300 },
  category: { type: String, maxlength: 50 },
  retryable: { type: Boolean, default: false },
}, { _id: false });

const accountSchema = new mongoose.Schema({
  accountId: { type: String, required: true },
  name: { type: String, default: "", maxlength: 200 },
  currency: { type: String, default: "", maxlength: 10 },
  status: { type: String, enum: ["pending", "running", "success", "failed"], default: "pending" },
  campaignCount: { type: Number, default: null },
  insightCount: { type: Number, default: null },
  matchedCount: { type: Number, default: 0 },
  modifiedCount: { type: Number, default: 0 },
  upsertedCount: { type: Number, default: 0 },
  staleCount: { type: Number, default: 0 },
  error: { type: errorSchema, default: null },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
}, { _id: false });

const facebookSyncJobSchema = new mongoose.Schema({
  agency: { type: mongoose.Schema.Types.ObjectId, ref: "Agency", required: true },
  provider: { type: String, enum: ["facebook"], default: "facebook" },
  kind: { type: String, enum: ["full", "retry"], required: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: "FacebookSyncJob", default: null },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  lockKey: { type: String, required: true, maxlength: 160 },
  status: { type: String, enum: ["queued", "running", "success", "partial", "failed"], default: "queued" },
  stage: { type: String, enum: ["queued", "discovery", "accounts", "complete"], default: "queued" },
  leaseOwner: { type: String, default: null },
  leaseToken: { type: String, default: null },
  claimVersion: { type: Number, default: 0 },
  leaseExpiresAt: { type: Date, default: null },
  heartbeatAt: { type: Date, default: null },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null },
  error: { type: errorSchema, default: null },
  progress: {
    total: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    succeeded: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    percent: { type: Number, default: 0 },
  },
  accounts: { type: [accountSchema], default: [] },
}, { timestamps: true });

facebookSyncJobSchema.index(
  { agency: 1, lockKey: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ["queued", "running"] } }, name: "facebook_sync_active_lock" },
);
facebookSyncJobSchema.index({ agency: 1, createdAt: -1 }, { name: "facebook_sync_history" });
facebookSyncJobSchema.index({ status: 1, createdAt: 1 }, { name: "facebook_sync_status" });
facebookSyncJobSchema.index({ status: 1, leaseExpiresAt: 1 }, { name: "facebook_sync_lease" });
facebookSyncJobSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "facebook_sync_ttl" });

export default mongoose.model("FacebookSyncJob", facebookSyncJobSchema);
