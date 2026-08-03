import mongoose from "mongoose";

const schema = new mongoose.Schema({
  agency: { type: mongoose.Schema.Types.ObjectId, ref: "Agency", required: true },
  accountId: { type: String, required: true, match: /^act_\d+$/ },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  fetchedAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
  purgeAt: { type: Date, required: true },
}, { timestamps: true });

schema.index({ agency: 1, accountId: 1, date: 1 }, { unique: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("FacebookAdAccountCache", schema);
