import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    agency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agency",
      required: true,
      index: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      default: null,
    },
    adRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdRequest",
      default: null,
      index: true,
    },
    entityType: {
      type: String,
      enum: ["agency", "client", "ad_request", "campaign", "invoice", "user", "settings"],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    detail: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

activityLogSchema.index({ agency: 1, createdAt: -1 });
activityLogSchema.index({ agency: 1, entityType: 1, entityId: 1 });

export default mongoose.model("ActivityLog", activityLogSchema);
