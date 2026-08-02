import mongoose from "mongoose";

const apiCredentialSchema = new mongoose.Schema(
  {
    agency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agency",
      required: true,
      unique: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ["facebook"],
      default: "facebook",
    },
    accessToken: {
      type: String,
      required: true,
      select: false,
    },
    defaultAdAccountId: {
      type: String,
      trim: true,
      default: "",
    },
    permissions: [
      {
        type: String,
        trim: true,
      },
    ],
    tokenExpiresAt: {
      type: Date,
      default: null,
    },
    isConnected: {
      type: Boolean,
      default: false,
    },
    lastVerifiedAt: {
      type: Date,
      default: null,
    },
    lastSyncAt: {
      type: Date,
      default: null,
    },
    apiUsage: {
      callsUsed: {
        type: Number,
        min: 0,
        default: 0,
      },
      callsLimit: {
        type: Number,
        min: 0,
        default: 200,
      },
      resetAt: {
        type: Date,
        default: null,
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model("ApiCredential", apiCredentialSchema);
