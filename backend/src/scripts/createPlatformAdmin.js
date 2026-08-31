import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "node:dns";
import Agency from "../models/Agency.model.js";
import User from "../models/User.model.js";
import { PLATFORM_ROLES, ROLES, USER_STATUSES, WORKSPACE_STATUSES } from "../constants/roles.js";
import { assertPasswordPolicy } from "../services/passwordPolicy.service.js";

dotenv.config();
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const email = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
const name = process.env.PLATFORM_ADMIN_NAME?.trim() || "SaaS Owner";
const password = process.env.PLATFORM_ADMIN_PASSWORD;

if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
if (!email) throw new Error("PLATFORM_ADMIN_EMAIL is required");

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await User.findOne({ email });
  if (existing) {
    existing.platformRole = PLATFORM_ROLES.ADMIN;
    existing.status = USER_STATUSES.ACTIVE;
    existing.isActive = true;
    await existing.save();
    console.log(`Promoted existing user to SaaS owner: ${email}`);
    await mongoose.disconnect();
    return;
  }

  assertPasswordPolicy(password, "PLATFORM_ADMIN_PASSWORD");

  const userId = new mongoose.Types.ObjectId();
  const agency = await Agency.create({
    name: "Platform HQ",
    slug: `platform-hq-${Date.now().toString(36)}`,
    onboardingCompleted: true,
    status: WORKSPACE_STATUSES.ACTIVE,
    owner: userId,
  });

  await User.create({
    _id: userId,
    agency: agency._id,
    name,
    email,
    password,
    role: ROLES.OWNER,
    platformRole: PLATFORM_ROLES.ADMIN,
    status: USER_STATUSES.ACTIVE,
    isActive: true,
    avatarColor: "bg-blue-600",
  });

  console.log(`SaaS owner created: ${email} (workspace: ${agency.name})`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
