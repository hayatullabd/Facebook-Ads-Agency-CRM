import mongoose from "mongoose";
import { env } from "../config/env.js";
import ApiCredential from "../models/ApiCredential.model.js";
import { decryptCredential } from "./credentialEncryption.service.js";
export async function verifyDatabaseReadiness() {
  const topology = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!topology.setName && topology.msg !== "isdbgrid") throw new Error("MongoDB must be a replica set or sharded cluster; payment and approval transactions require it");
  if (!env.isProduction) {
    await Promise.all(Object.values(mongoose.models).map(model => model.init()));
    return;
  }
  for (const model of Object.values(mongoose.models)) {
    const expected = model.schema.indexes().filter(([, options]) => options.unique || options.expireAfterSeconds !== undefined);
    if (!expected.length) continue;
    let existing;
    try { existing = await model.collection.indexes(); } catch { throw new Error("Database indexes are missing. Run npm run migrate -- --apply before starting production."); }
    for (const [keys, options] of expected) {
      if (!existing.some(index => JSON.stringify(index.key) === JSON.stringify(keys) && (!options.unique || index.unique) && (options.expireAfterSeconds === undefined || index.expireAfterSeconds === options.expireAfterSeconds))) throw new Error(`Required indexes are missing for ${model.modelName}. Run the migration.`);
    }
  }
  for await (const credential of ApiCredential.collection.find({ accessToken: { $type: "string", $ne: "" } }, { projection: { accessToken: 1 } })) {
    decryptCredential(credential.accessToken);
  }
}
