import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema({
  agency: { type: mongoose.Schema.Types.ObjectId, ref: "Agency", required: true, index: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true, index: true },
  adRequest: { type: mongoose.Schema.Types.ObjectId, ref: "AdRequest", required: true, index: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true, trim: true, maxlength: 255 },
  url: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2048,
    validate: {
      validator(value) {
        try {
          const parsed = new URL(value);
          return parsed.protocol === "http:" || parsed.protocol === "https:";
        } catch {
          return false;
        }
      },
      message: "Attachment URL must be an absolute HTTP or HTTPS URL",
    },
  },
  mimeType: { type: String, trim: true, maxlength: 100, default: "" },
  size: { type: Number, min: 0, default: null },
}, { timestamps: true });

attachmentSchema.index({ agency: 1, adRequest: 1, createdAt: 1 });
export default mongoose.model("Attachment", attachmentSchema);
