import mongoose from "mongoose";

const clientUpdateSchema = new mongoose.Schema(
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
      index: true,
    },
    type: {
      type: String,
      enum: ["message", "performance", "billing", "status"],
      default: "message",
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

clientUpdateSchema.index({ agency: 1, client: 1, createdAt: -1 });
clientUpdateSchema.index({ agency: 1, adRequest: 1, createdAt: -1 });

export default mongoose.model("ClientUpdate", clientUpdateSchema);
