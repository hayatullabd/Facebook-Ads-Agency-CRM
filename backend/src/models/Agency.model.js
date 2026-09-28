import mongoose from "mongoose";
import { WORKSPACE_STATUSES } from "../constants/roles.js";

const agencySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Agency name is required"],
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    logoUrl: {
      type: String,
      default: "",
    },
    defaultCurrency: {
      type: String,
      enum: ["BDT", "USD", "INR"],
      default: "BDT",
    },
    defaultRate: {
      type: Number,
      min: 1,
      default: 110,
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: Object.values(WORKSPACE_STATUSES),
      default: WORKSPACE_STATUSES.ACTIVE,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      default: null,
      index: true,
    },
    subscriptionPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      default: null,
      index: true,
    },
    subscriptionStatus: {
      type: String,
      enum: ["trialing", "active", "past_due", "paused", "canceled", "expired"],
      default: "trialing",
      index: true,
    },
    subscriptionRenewalAt: {
      type: Date,
      default: null,
      index: true,
    },
    paymentDetails: {
      type: [{
        method: { type: String, enum: ["bkash", "nagad", "bank", "cash"], required: true },
        name: { type: String, trim: true, maxlength: 80, default: "" },
        accountName: { type: String, trim: true, maxlength: 120, required: true },
        accountNumber: { type: String, trim: true, maxlength: 80, required: true },
        bankName: { type: String, trim: true, maxlength: 120, default: "" },
        branchName: { type: String, trim: true, maxlength: 120, default: "" },
        routingNumber: { type: String, trim: true, maxlength: 40, default: "" },
      }],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model("Agency", agencySchema);
