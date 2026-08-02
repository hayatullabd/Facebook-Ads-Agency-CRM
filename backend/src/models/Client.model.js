import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    agency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agency",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Client business name is required"],
      trim: true,
      maxlength: 120,
    },
    contactName: {
      type: String,
      required: [true, "Contact name is required"],
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, "Client email is required"],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    facebookPageName: {
      type: String,
      trim: true,
      default: "",
    },
    facebookPageId: {
      type: String,
      trim: true,
      default: "",
    },
    adAccountId: {
      type: String,
      trim: true,
      default: "",
    },
    facebookAdAccountIds: {
      type: [{ type: String, trim: true, match: /^act_\d+$/ }],
      default: [],
    },
    status: {
      type: String,
      enum: ["active", "paused", "onboarding"],
      default: "onboarding",
      index: true,
    },
    monthlyBudget: {
      type: Number,
      min: 0,
      default: 0,
    },
    totalSpend: {
      type: Number,
      min: 0,
      default: 0,
    },
    activeCampaigns: {
      type: Number,
      min: 0,
      default: 0,
    },
    billingRate: {
      type: Number,
      min: 1,
      default: 110,
    },
    color: {
      type: String,
      default: "bg-blue-600",
    },
    assignedTeamMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    notes: {
      type: String,
      maxlength: 1000,
      default: "",
    },
  },
  { timestamps: true }
);

clientSchema.index({ agency: 1, email: 1 }, { unique: true });
clientSchema.index(
  { agency: 1, facebookAdAccountIds: 1 },
  { unique: true, partialFilterExpression: { "facebookAdAccountIds.0": { $exists: true } } }
);

export default mongoose.model("Client", clientSchema);
