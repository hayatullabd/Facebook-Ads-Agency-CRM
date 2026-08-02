import mongoose from "mongoose";

const CANONICAL_PLATFORMS = ["facebook", "instagram", "youtube", "google"];
const LEGACY_PLATFORMS = ["both"];

export const normalizeAdRequestPlatforms = (value) => {
  const values = Array.isArray(value) ? value : [value];
  return [...new Set(values.flatMap((platform) => platform === "both" ? ["facebook", "instagram"] : [platform]))];
};

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
      type: mongoose.Schema.Types.Mixed,
      required: true,
      validate: {
        validator(value) {
          const values = Array.isArray(value) ? value : [value];
          return values.length > 0 && values.every((platform) => [...CANONICAL_PLATFORMS, ...LEGACY_PLATFORMS].includes(platform));
        },
        message: "Platform must contain valid platform values",
      },
      set: normalizeAdRequestPlatforms,
    },
    objectiveGroup: {
      type: String,
      enum: ["website", "engagement", "message", "others", "page", "awareness", "leads"],
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
    contentLink: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: "",
      validate: {
        validator(value) {
          if (!value) return true;
          try {
            const url = new URL(value);
            return url.protocol === "http:" || url.protocol === "https:";
          } catch {
            return false;
          }
        },
        message: "Content link must be an absolute HTTP or HTTPS URL",
      },
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
