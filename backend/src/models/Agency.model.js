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
  },
  { timestamps: true }
);

export default mongoose.model("Agency", agencySchema);
