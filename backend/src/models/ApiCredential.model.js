import mongoose from "mongoose";

const adAccountSnapshotSchema = new mongoose.Schema(
  {
    facebookAdAccountId: { type: String, required: true, trim: true, match: /^act_\d+$/ },
    accountId: { type: String, required: true, trim: true },
    name: { type: String, trim: true, default: "" },
    accountStatus: { type: Number, default: null },
    currency: { type: String, trim: true, default: "" },
    timezoneName: { type: String, trim: true, default: "" },
    balance: { type: Number, default: null },
    amountSpent: { type: Number, default: null },
    spendCap: { type: Number, default: null },
    lastSeenAt: { type: Date, required: true },
    isAccessible: { type: Boolean, default: true },
  },
  { _id: false }
);

const apiCredentialSchema = new mongoose.Schema(
  {
    agency: { type: mongoose.Schema.Types.ObjectId, ref: "Agency", required: true, unique: true, index: true },
    provider: { type: String, enum: ["facebook"], default: "facebook" },
    accessToken: { type: String, default: "", select: false },
    defaultAdAccountId: { type: String, trim: true, default: "" },
    adAccounts: { type: [adAccountSnapshotSchema], default: [] },
    permissions: [{ type: String, trim: true }],
    tokenExpiresAt: { type: Date, default: null },
    isConnected: { type: Boolean, default: false },
    lastVerifiedAt: { type: Date, default: null },
    lastSyncAt: { type: Date, default: null },
    lastAccountSyncAt: { type: Date, default: null },
    lastSyncStatus: { type: String, enum: ["never", "success", "partial", "failed"], default: "never" },
    apiUsage: {
      callsUsed: { type: Number, min: 0, default: 0 },
      callsLimit: { type: Number, min: 0, default: 200 },
      resetAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

export default mongoose.model("ApiCredential", apiCredentialSchema);
