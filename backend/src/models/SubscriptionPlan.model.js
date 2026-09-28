import mongoose from "mongoose";

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Plan name is required"], trim: true, minlength: 2, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    interval: { type: String, enum: ["monthly"], default: "monthly" },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ["BDT", "USD", "INR"], default: "USD" },
    features: [{ type: String, trim: true }],
    limits: {
      clients: { type: Number, default: 0, min: 0 },
      users: { type: Number, default: 0, min: 0 },
      requests: { type: Number, default: 0, min: 0 },
    },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export default mongoose.model("SubscriptionPlan", subscriptionPlanSchema);
