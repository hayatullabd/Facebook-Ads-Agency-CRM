import mongoose from "mongoose";
import "../app.js";
import { connectDB } from "../config/db.js";
import { env } from "../config/env.js";
import Invoice from "../models/Invoice.model.js";
import ApiCredential from "../models/ApiCredential.model.js";
import { encryptCredential, decryptCredential } from "../services/credentialEncryption.service.js";
const apply = process.argv.includes("--apply");
try {
  // Migration preflight must not implicitly build indexes before checking duplicates.
  mongoose.set("autoIndex", false);
  await mongoose.connect(env.mongodbUri, { autoIndex: false, serverSelectionTimeoutMS: 15000 });
  const duplicates = await Invoice.aggregate([{ $group: { _id: { agency: "$agency", adRequest: "$adRequest" }, count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }, { $count: "groups" }]);
  if (duplicates.length) throw new Error(`${duplicates[0].groups} duplicate invoice groups require manual reconciliation. No records were deleted.`);
  let encrypted = 0;
  for await (const row of ApiCredential.collection.find({ accessToken: { $type: "string", $ne: "" } })) {
    if (row.accessToken.startsWith("enc:v1:")) { decryptCredential(row.accessToken); continue; }
    encrypted += 1;
    if (apply) await ApiCredential.collection.updateOne({ _id: row._id, accessToken: row.accessToken }, { $set: { accessToken: encryptCredential(row.accessToken) } });
  }
  console.log(`${encrypted} legacy credentials ${apply ? "encrypted" : "require encryption"}.`);
  if (apply) {
    // Add missing indexes only. Never drop indexes or delete financial records.
    for (const model of Object.values(mongoose.models)) await model.createIndexes();
    console.log("Production migration completed. All existing login sessions must sign in again after the JWT format upgrade.");
  } else console.log("Preflight only. Back up the database, then run npm run migrate -- --apply during maintenance.");
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await mongoose.disconnect(); }
