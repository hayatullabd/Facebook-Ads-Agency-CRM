import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
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
    adRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdRequest",
      required: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    pageName: {
      type: String,
      required: true,
      trim: true,
    },
    objective: {
      type: String,
      required: true,
      trim: true,
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
    },
    rate: {
      type: Number,
      required: true,
      min: 1,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      enum: ["BDT", "USD", "INR"],
      default: "BDT",
    },
    status: {
      type: String,
      enum: ["Unpaid", "Paid", "Overdue"],
      default: "Unpaid",
      index: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "bank", "bkash", "nagad", "stripe", "manual", ""],
      default: "",
    },
    notes: {
      type: String,
      maxlength: 1000,
      default: "",
    },
  },
  { timestamps: true }
);

invoiceSchema.index({ agency: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ agency: 1, status: 1, dueDate: 1 });

export default mongoose.model("Invoice", invoiceSchema);
