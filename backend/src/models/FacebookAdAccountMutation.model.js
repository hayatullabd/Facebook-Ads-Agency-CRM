import mongoose from "mongoose";

const schema = new mongoose.Schema({
  agency: { type: mongoose.Schema.Types.ObjectId, ref: "Agency", required: true },
  credential: { type: mongoose.Schema.Types.ObjectId, ref: "ApiCredential", required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  accountId: { type: String, required: true, match: /^act_\d+$/ },
  idempotencyKey: { type: String, required: true },
  requestHash: { type: String, required: true },
  status: { type: String, enum: ["pending", "succeeded", "failed", "unknown"], default: "pending" },
  operation: { type: String, enum: ["set", "add", "reduce"], required: true },
  amountMinor: { type: String, required: true },
  oldMinor: { type: String, required: true },
  targetMinor: { type: String, required: true },
  currency: { type: String, required: true },
  result: { type: mongoose.Schema.Types.Mixed, default: null },
  errorCategory: { type: String, default: "" },
  lockActive: { type: Boolean, default: true },
  completedAt: { type: Date, default: null },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

schema.index({ agency: 1, idempotencyKey: 1 }, { unique: true });
schema.index({ agency: 1, accountId: 1 }, { unique: true, partialFilterExpression: { lockActive: true } });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("FacebookAdAccountMutation", schema);
