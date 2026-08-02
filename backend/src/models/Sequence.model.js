import mongoose from "mongoose";

const sequenceSchema = new mongoose.Schema(
  {
    agency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agency",
      required: true,
    },
    key: {
      type: String,
      required: true,
      trim: true,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  { timestamps: true }
);

sequenceSchema.index({ agency: 1, key: 1 }, { unique: true });

export default mongoose.model("Sequence", sequenceSchema);
