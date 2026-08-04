import dotenv from "dotenv";
import dns from "node:dns";
import mongoose from "mongoose";
import User from "../models/User.model.js";
import { assertPasswordPolicy } from "../services/passwordPolicy.service.js";

dotenv.config();
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const accounts = [
  { email: "admin@adflow.test", envName: "ROTATE_ADMIN_PASSWORD" },
  { email: "team@adflow.test", envName: "ROTATE_TEAM_PASSWORD" },
  { email: "moderator@adflow.test", envName: "ROTATE_MODERATOR_PASSWORD" },
  { email: "client@adflow.test", envName: "ROTATE_CLIENT_PASSWORD" },
];

if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
for (const account of accounts) {
  assertPasswordPolicy(process.env[account.envName], account.envName);
}

const rotatePasswords = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  for (const account of accounts) {
    const user = await User.findOne({ email: account.email }).select("+password");
    if (!user) {
      console.warn(`Account not found: ${account.email}`);
      continue;
    }

    user.password = process.env[account.envName];
    await user.save();
    console.log(`Password rotated: ${account.email}`);
  }

  await mongoose.disconnect();
};

rotatePasswords().catch(async (error) => {
  console.error("Password rotation failed:", error.message);
  await mongoose.disconnect();
  process.exit(1);
});
