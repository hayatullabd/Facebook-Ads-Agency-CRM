import mongoose from "mongoose";

const subscriptionInvoiceSchema = new mongoose.Schema(
  {
    agency: { type: mongoose.Schema.Types.ObjectId, ref: "Agency", required: true, index: true },
    invoiceNumber: { type: String, required: true, unique: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ["BDT", "USD", "INR"], default: "USD" },
    status: { type: String, enum: ["Unpaid", "Paid"], default: "Unpaid", index: true },
    dueDate: { type: Date, required: true, index: true },
    paidAt: { type: Date, default: null },
    note: { type: String, trim: true, default: "", maxlength: 300 },
  },
  { timestamps: true }
);

export default mongoose.model("SubscriptionInvoice", subscriptionInvoiceSchema);
