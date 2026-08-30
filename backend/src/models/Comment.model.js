import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  agency: { type: mongoose.Schema.Types.ObjectId, ref: "Agency", required: true, index: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true, index: true },
  adRequest: { type: mongoose.Schema.Types.ObjectId, ref: "AdRequest", required: true, index: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true, trim: true, maxlength: 2000 },
}, { timestamps: true });

commentSchema.index({ agency: 1, adRequest: 1, createdAt: 1 });
export default mongoose.model("Comment", commentSchema);
