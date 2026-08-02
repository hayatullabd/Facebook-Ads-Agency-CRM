import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "node:dns";
import Agency from "../models/Agency.model.js";
import User from "../models/User.model.js";
import Client from "../models/Client.model.js";
import AdRequest from "../models/AdRequest.model.js";
import Campaign from "../models/Campaign.model.js";
import Invoice from "../models/Invoice.model.js";
import ClientUpdate from "../models/ClientUpdate.model.js";
import ActivityLog from "../models/ActivityLog.model.js";
import { assertPasswordPolicy } from "../services/passwordPolicy.service.js";

dotenv.config();
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const seedPasswords = {
  admin: process.env.SEED_ADMIN_PASSWORD,
  team: process.env.SEED_TEAM_PASSWORD,
  moderator: process.env.SEED_MODERATOR_PASSWORD,
  client: process.env.SEED_CLIENT_PASSWORD,
};

if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
for (const [role, password] of Object.entries(seedPasswords)) {
  assertPasswordPolicy(password, `SEED_${role.toUpperCase()}_PASSWORD`);
}

const agencyId = new mongoose.Types.ObjectId();
const adminId = new mongoose.Types.ObjectId();
const teamId = new mongoose.Types.ObjectId();
const moderatorId = new mongoose.Types.ObjectId();
const clientUserId = new mongoose.Types.ObjectId();
const clientIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
const requestIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
const campaignIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
const invoiceIds = [new mongoose.Types.ObjectId()];

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  await Promise.all([
    Agency.deleteMany({}),
    User.deleteMany({}),
    Client.deleteMany({}),
    AdRequest.deleteMany({}),
    Campaign.deleteMany({}),
    Invoice.deleteMany({}),
    ClientUpdate.deleteMany({}),
    ActivityLog.deleteMany({}),
  ]);

  const agency = await Agency.create({
    _id: agencyId,
    name: "Pixel Wave Digital",
    slug: "pixel-wave-digital",
    defaultCurrency: "BDT",
    defaultRate: 110,
    onboardingCompleted: true,
    owner: adminId,
  });

  const admin = await User.create({
    _id: adminId,
    agency: agency._id,
    name: "Admin User",
    email: "admin@adflow.test",
    password: seedPasswords.admin,
    role: "admin",
    avatarColor: "bg-blue-600",
  });

  const team = await User.create({
    _id: teamId,
    agency: agency._id,
    name: "Team User",
    email: "team@adflow.test",
    password: seedPasswords.team,
    role: "team",
    avatarColor: "bg-emerald-600",
  });

  const clients = await Client.insertMany([
    {
      _id: clientIds[0],
      agency: agency._id,
      name: "Urban Threads Co.",
      contactName: "Arjun Kapoor",
      email: "arjun@urbanthreads.test",
      facebookPageName: "Urban Threads Co.",
      adAccountId: "act_123456789",
      status: "active",
      monthlyBudget: 600,
      totalSpend: 4200,
      activeCampaigns: 1,
      billingRate: 110,
      color: "bg-blue-600",
    },
    {
      _id: clientIds[1],
      agency: agency._id,
      name: "Stellar Eats",
      contactName: "Priya Mehta",
      email: "priya@stellareats.test",
      facebookPageName: "Stellar Eats Official",
      adAccountId: "act_987654321",
      status: "active",
      monthlyBudget: 1050,
      totalSpend: 8100,
      activeCampaigns: 1,
      billingRate: 115,
      color: "bg-emerald-600",
    },
    {
      _id: clientIds[2],
      agency: agency._id,
      name: "ZenFlow Wellness",
      contactName: "Meera Singh",
      email: "meera@zenflow.test",
      facebookPageName: "ZenFlow Wellness",
      adAccountId: "act_456789012",
      status: "paused",
      monthlyBudget: 450,
      totalSpend: 1800,
      activeCampaigns: 0,
      billingRate: 108,
      color: "bg-violet-600",
    },
  ]);

  const moderator = await User.create({
    _id: moderatorId,
    agency: agency._id,
    client: clients[0]._id,
    name: "Client Moderator",
    email: "moderator@adflow.test",
    password: seedPasswords.moderator,
    role: "moderator",
    avatarColor: "bg-amber-600",
  });

  const clientUser = await User.create({
    _id: clientUserId,
    agency: agency._id,
    client: clients[0]._id,
    name: "Client User",
    email: "client@adflow.test",
    password: seedPasswords.client,
    role: "client",
    avatarColor: "bg-violet-600",
  });

  const requests = await AdRequest.insertMany([
    {
      _id: requestIds[0],
      agency: agency._id,
      client: clients[0]._id,
      requestNumber: "REQ-001",
      pageName: "Urban Threads Co.",
      platform: "both",
      objectiveGroup: "engagement",
      objective: "WhatsApp",
      budget: { amount: 20, type: "daily", currency: "USD" },
      durationDays: 30,
      notes: "Target women 25-40 in Mumbai and Delhi.",
      status: "Live",
      agencyNote: "CPR ৳181 · Above target",
      submittedBy: clientUser._id,
      reviewedBy: admin._id,
      approvedAt: new Date(),
      launchedAt: new Date(),
    },
    {
      _id: requestIds[1],
      agency: agency._id,
      client: clients[1]._id,
      requestNumber: "REQ-002",
      pageName: "Stellar Eats Official",
      platform: "facebook",
      objectiveGroup: "engagement",
      objective: "Post Engagement",
      budget: { amount: 35, type: "daily", currency: "USD" },
      durationDays: 14,
      notes: "New menu launch video.",
      status: "Approved",
      agencyNote: "Goes live after creative approval",
      submittedBy: team._id,
      reviewedBy: team._id,
      approvedAt: new Date(),
    },
    {
      _id: requestIds[2],
      agency: agency._id,
      client: clients[0]._id,
      requestNumber: "REQ-003",
      pageName: "Urban Threads Co.",
      platform: "instagram",
      objectiveGroup: "awareness",
      objective: "Brand Awareness",
      budget: { amount: 50, type: "lifetime", currency: "USD" },
      durationDays: 7,
      notes: "",
      status: "Under Review",
      submittedBy: clientUser._id,
    },
  ]);

  await Campaign.insertMany([
    {
      _id: campaignIds[0],
      agency: agency._id,
      client: clients[0]._id,
      adRequest: requests[0]._id,
      facebookCampaignId: "fb_cmp_001",
      name: "Urban Threads WhatsApp Push",
      platform: "both",
      objective: "WhatsApp",
      status: "active",
      budget: { amount: 20, type: "daily", currency: "USD" },
      startDate: new Date(),
      performance: { spend: 420, reach: 18420, impressions: 32250, results: 347, costPerResult: 181, lastSyncedAt: new Date() },
    },
    {
      _id: campaignIds[1],
      agency: agency._id,
      client: clients[1]._id,
      adRequest: requests[1]._id,
      facebookCampaignId: "fb_cmp_002",
      name: "Stellar Eats Menu Launch",
      platform: "facebook",
      objective: "Post Engagement",
      status: "scheduled",
      budget: { amount: 35, type: "daily", currency: "USD" },
      performance: { spend: 0, reach: 0, impressions: 0, results: 0, costPerResult: 0 },
    },
  ]);

  await Invoice.create({
    _id: invoiceIds[0],
    agency: agency._id,
    client: clients[0]._id,
    adRequest: requests[0]._id,
    invoiceNumber: "INV-001",
    pageName: "Urban Threads Co.",
    objective: "WhatsApp",
    budget: { amount: 20, type: "daily", currency: "USD" },
    durationDays: 30,
    rate: 110,
    amount: 66000,
    currency: "BDT",
    status: "Paid",
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    paidAt: new Date(),
    paymentMethod: "manual",
  });

  await ClientUpdate.create({
    agency: agency._id,
    client: clients[0]._id,
    adRequest: requests[0]._id,
    type: "performance",
    title: "Performance Update",
    content: "Reach: 18,420 · Results: 347 Messages · CPR: ৳181 · Status: Above target",
    sentBy: team._id,
  });

  await ActivityLog.insertMany([
    {
      agency: agency._id,
      actor: admin._id,
      client: clients[0]._id,
      adRequest: requests[0]._id,
      entityType: "ad_request",
      entityId: requests[0]._id,
      action: "status_changed",
      detail: "Approved → Live",
    },
    {
      agency: agency._id,
      actor: team._id,
      client: clients[1]._id,
      adRequest: requests[1]._id,
      entityType: "ad_request",
      entityId: requests[1]._id,
      action: "status_changed",
      detail: "Under Review → Approved",
    },
  ]);

  console.log("Seed completed");
  console.log("Seeded accounts: admin@adflow.test, team@adflow.test, moderator@adflow.test, client@adflow.test");
  await mongoose.disconnect();
};

seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
