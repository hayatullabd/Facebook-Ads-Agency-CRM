import mongoose from "mongoose";
const schema = new mongoose.Schema({
  _id: { type: String },
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, expires: 0 },
}, { versionKey: false });
export default mongoose.model("RateLimit", schema);
