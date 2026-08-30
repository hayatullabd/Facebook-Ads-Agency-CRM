import mongoose from "mongoose";

const paymentTransactionSchema = new mongoose.Schema({
  agency: { type: mongoose.Schema.Types.ObjectId, ref: "Agency", required: true, index: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true, index: true },
  account: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentAccount", required: true, index: true },
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", default: null, index: true },
  type: { type: String, enum: ["credit", "debit"], required: true },
  amount: { type: Number, required: true, min: 0.01 },
  currency: { type: String, enum: ["BDT", "USD", "INR"], required: true },
  method: { type: String, enum: ["cash", "bank", "bkash", "nagad", "stripe", "manual"], default: "manual" },
  reference: { type: String, trim: true, default: "", maxlength: 160 },
  description: { type: String, trim: true, default: "", maxlength: 1000 },
  transactionDate: { type: Date, default: Date.now, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

paymentTransactionSchema.index({ agency: 1, account: 1, transactionDate: -1 });
export default mongoose.model("PaymentTransaction", paymentTransactionSchema);
