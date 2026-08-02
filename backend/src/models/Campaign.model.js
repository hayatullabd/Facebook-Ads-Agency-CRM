import mongoose from "mongoose";

const campaignSchema = new mongoose.Schema(
  {
    agency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agency",
      required: true,
      index: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    adRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdRequest",
      required: true,
      unique: true,
    },
    facebookCampaignId: {
      type: String,
      trim: true,
      default: "",
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    platform: {
      type: String,
      enum: ["facebook", "instagram", "both"],
      required: true,
    },
    objective: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "active", "paused", "completed", "failed"],
      default: "draft",
      index: true,
    },
    budget: {
      amount: {
        type: Number,
        required: true,
        min: 1,
      },
      type: {
        type: String,
        enum: ["daily", "lifetime"],
        required: true,
      },
      currency: {
        type: String,
        enum: ["USD", "BDT", "INR"],
        default: "USD",
      },
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    performance: {
      spend: {
        type: Number,
        min: 0,
        default: 0,
      },
      reach: {
        type: Number,
        min: 0,
        default: 0,
      },
      impressions: {
        type: Number,
        min: 0,
        default: 0,
      },
      results: {
        type: Number,
        min: 0,
        default: 0,
      },
      costPerResult: {
        type: Number,
        min: 0,
        default: 0,
      },
      lastSyncedAt: {
        type: Date,
        default: null,
      },
    },
  },
  { timestamps: true }
);

campaignSchema.index({ agency: 1, status: 1 });
campaignSchema.index({ agency: 1, client: 1 });

export default mongoose.model("Campaign", campaignSchema);
