import mongoose from "mongoose";

const requiredForCrm = function requiredForCrm() {
  return this.source !== "facebook";
};

const campaignSchema = new mongoose.Schema(
  {
    agency: { type: mongoose.Schema.Types.ObjectId, ref: "Agency", required: true, index: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: requiredForCrm, default: null, index: true },
    adRequest: { type: mongoose.Schema.Types.ObjectId, ref: "AdRequest", required: requiredForCrm, default: null },
    source: { type: String, enum: ["crm", "facebook"], default: "crm", index: true },
    facebookCampaignId: { type: String, trim: true, default: "" },
    facebookAdAccountId: { type: String, trim: true, default: "" },
    facebookAdAccountName: { type: String, trim: true, default: "" },
    facebookStatus: { type: String, trim: true, default: "" },
    effectiveStatus: { type: String, trim: true, default: "" },
    facebookObjective: { type: String, trim: true, default: "" },
    lastSeenAt: { type: Date, default: null },
    syncRunId: { type: String, default: "", index: true },
    isStale: { type: Boolean, default: false, index: true },
    name: { type: String, required: true, trim: true, maxlength: 180 },
    platform: { type: String, enum: ["facebook", "instagram", "both"], required: true },
    objective: { type: String, required: requiredForCrm, trim: true, default: "" },
    status: { type: String, enum: ["draft", "scheduled", "active", "paused", "completed", "failed"], default: "draft", index: true },
    budget: {
      amount: { type: Number, required: requiredForCrm, min: 0, default: null },
      type: { type: String, enum: ["daily", "lifetime"], required: requiredForCrm, default: null },
      currency: { type: String, trim: true, default: "USD" },
    },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    performance: {
      spend: { type: Number, min: 0, default: 0 },
      reach: { type: Number, min: 0, default: 0 },
      impressions: { type: Number, min: 0, default: 0 },
      results: { type: Number, min: 0, default: 0 },
      resultMetric: { type: String, trim: true, default: "" },
      costPerResult: { type: Number, min: 0, default: 0 },
      lastSyncedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

campaignSchema.index({ agency: 1, status: 1 });
campaignSchema.index({ agency: 1, client: 1 });
campaignSchema.index({ agency: 1, facebookAdAccountId: 1, createdAt: -1 });
campaignSchema.index(
  { agency: 1, facebookAdAccountId: 1, facebookCampaignId: 1 },
  { unique: true, partialFilterExpression: { source: "facebook", facebookAdAccountId: { $type: "string", $gt: "" }, facebookCampaignId: { $type: "string", $gt: "" } } }
);
campaignSchema.index(
  { adRequest: 1 },
  { unique: true, partialFilterExpression: { adRequest: { $type: "objectId" } } }
);

export default mongoose.model("Campaign", campaignSchema);
