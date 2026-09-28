import mongoose from "mongoose";

const campaignDailyStatSchema = new mongoose.Schema(
  {
    agency: { type: mongoose.Schema.Types.ObjectId, ref: "Agency", required: true, index: true },
    facebookAdAccountId: { type: String, required: true, trim: true },
    facebookCampaignId: { type: String, required: true, trim: true },
    date: { type: String, required: true, trim: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    spend: { type: Number, min: 0, default: 0 },
    impressions: { type: Number, min: 0, default: 0 },
    reach: { type: Number, min: 0, default: 0 },
    results: { type: Number, min: 0, default: 0 },
    resultMetric: { type: String, trim: true, default: "" },
    ctrAll: { type: Number, min: 0, default: 0 },
    currency: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

campaignDailyStatSchema.index(
  { agency: 1, facebookAdAccountId: 1, facebookCampaignId: 1, date: 1 },
  { unique: true }
);

export default mongoose.model("CampaignDailyStat", campaignDailyStatSchema);
