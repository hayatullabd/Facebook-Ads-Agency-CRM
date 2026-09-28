import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    agency: { type: mongoose.Schema.Types.ObjectId, ref: "Agency", required: true, index: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: "SubscriptionPlan", required: true, index: true },
    status: { type: String, enum: ["trialing", "active", "past_due", "paused", "canceled", "expired"], default: "trialing", index: true },
    startAt: { type: Date, default: () => new Date() },
    trialEndsAt: { type: Date, default: null },
    currentPeriodStart: { type: Date, default: () => new Date() },
    currentPeriodEnd: { type: Date, default: null, index: true },
    renewalAt: { type: Date, default: null, index: true },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    autoRenew: { type: Boolean, default: true },
    paymentProviderRef: { type: String, default: "" },
    lastInvoice: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", default: null },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

subscriptionSchema.index({ agency: 1, status: 1 }, { unique: true, partialFilterExpression: { status: "active" } });
subscriptionSchema.index({ status: 1, autoRenew: 1, renewalAt: 1 });

export default mongoose.model("Subscription", subscriptionSchema);
