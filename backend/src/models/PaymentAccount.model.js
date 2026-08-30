import mongoose from "mongoose";

const paymentAccountSchema = new mongoose.Schema({
  agency: { type: mongoose.Schema.Types.ObjectId, ref: "Agency", required: true, index: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  provider: { type: String, trim: true, default: "manual", maxlength: 50 },
  accountReference: { type: String, trim: true, default: "", maxlength: 160 },
  currency: { type: String, enum: ["BDT", "USD", "INR"], default: "BDT" },
  openingBalance: { type: Number, min: 0, default: 0 },
  balance: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
  notes: { type: String, maxlength: 1000, default: "" },
}, { timestamps: true });

paymentAccountSchema.index({ agency: 1, client: 1, name: 1 }, { unique: true });
export default mongoose.model("PaymentAccount", paymentAccountSchema);
