import mongoose from "mongoose";

const adRequestSchema = new mongoose.Schema(
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
    requestNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    pageName: {
      type: String,
      required: [true, "Page name is required"],
      trim: true,
      maxlength: 150,
    },
    platform: {
      type: String,
      enum: ["facebook", "instagram", "both"],
      required: true,
    },
    objectiveGroup: {
      type: String,
      enum: ["website", "engagement", "page", "awareness", "leads"],
      required: true,
    },
    objective: {
      type: String,
      required: [true, "Campaign objective is required"],
      trim: true,
      maxlength: 100,
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
    durationDays: {
      type: Number,
      required: true,
      min: 1,
      max: 365,
    },
    notes: {
      type: String,
      maxlength: 2000,
      default: "",
    },
    status: {
      type: String,
      enum: ["Under Review", "Approved", "Live", "Rejected"],
      default: "Under Review",
      index: true,
    },
    agencyNote: {
      type: String,
      maxlength: 1000,
      default: "",
    },
    rejectionReason: {
      type: String,
      maxlength: 1000,
      default: "",
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    launchedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

adRequestSchema.index({ agency: 1, requestNumber: 1 }, { unique: true });
adRequestSchema.index({ agency: 1, status: 1, createdAt: -1 });

export default mongoose.model("AdRequest", adRequestSchema);
