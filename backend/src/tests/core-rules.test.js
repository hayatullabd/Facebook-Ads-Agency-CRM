import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import mongoose from "mongoose";
import Agency from "../models/Agency.model.js";
import AdRequest from "../models/AdRequest.model.js";
import Campaign from "../models/Campaign.model.js";
import Client from "../models/Client.model.js";
import Invoice from "../models/Invoice.model.js";
import PaymentAccount from "../models/PaymentAccount.model.js";
import ApiCredential from "../models/ApiCredential.model.js";
import User from "../models/User.model.js";
import { changeAccountPassword, loginAccount } from "../services/auth.service.js";
import { TOKEN_PREFIX } from "../services/tokenCipher.service.js";
import { setCampaignRequestAssignment } from "../services/campaignAssignment.service.js";
import { applyAdvanceToInvoice, recordClientAdvance } from "../services/payment.service.js";
import { ApiError } from "../utils/ApiError.js";

const password = "TestPass123!ab";
const testDatabase = "adflow_rule_tests";

function testDatabaseUri(uri) {
  const match = String(uri || "").match(/^(mongodb(?:\+srv)?:\/\/[^/?]*)(\/[^?]*)?(\?.*)?$/);
  if (!match) throw new Error("MONGODB_URI is required to run the rule tests");
  return `${match[1]}/${testDatabase}${match[3] || ""}`;
}

before(async () => {
  await mongoose.connect(testDatabaseUri(process.env.MONGODB_URI));
  if (mongoose.connection.name !== testDatabase) throw new Error("Refusing to run rule tests outside the test database");
});

after(async () => {
  if (mongoose.connection.readyState === 1 && mongoose.connection.name === testDatabase) {
    await mongoose.connection.dropDatabase();
  }
  await mongoose.disconnect();
});

async function workspace() {
  const agency = await Agency.create({ name: "Test Agency", slug: `test-${Date.now()}-${Math.random().toString(16).slice(2)}`, status: "active" });
  const owner = await User.create({ agency: agency._id, name: "Owner User", email: `owner-${agency.slug}@example.com`, password, role: "owner", status: "active", isActive: true });
  const client = await Client.create({ agency: agency._id, name: "Riaz Store", contactName: "Riaz", email: `riaz-${agency.slug}@example.com`, billingRate: 110, billingCurrency: "BDT" });
  const actor = { _id: owner._id, role: "owner", agency: agency._id };
  return { agency, owner, client, actor };
}

async function invoiceFor(agency, client, owner, amount) {
  const request = await AdRequest.create({
    agency: agency._id,
    client: client._id,
    submittedBy: owner._id,
    requestNumber: `REQ-${agency.slug}`,
    pageName: "Riaz Page",
    platform: ["facebook"],
    objectiveGroup: ["engagement"],
    objective: ["Reach"],
    budget: { amount: 20, type: "daily", currency: "BDT" },
    durationDays: 30,
    status: "Approved",
  });
  return Invoice.create({
    agency: agency._id,
    client: client._id,
    adRequest: request._id,
    invoiceNumber: `INV-${agency.slug}`,
    pageName: "Riaz Page",
    objective: "Reach",
    budget: { amount: 20, type: "daily", currency: "BDT" },
    durationDays: 30,
    rate: 110,
    amount,
    currency: "BDT",
    status: "Unpaid",
    dueDate: new Date("2026-10-01"),
  });
}

describe("login", () => {
  it("returns a token for the right password and rejects the wrong one", async () => {
    const { owner } = await workspace();
    const signedIn = await loginAccount({ email: owner.email, password });
    assert.equal(String(signedIn.user._id), String(owner._id));
    assert.equal(typeof signedIn.token, "string");
    assert.equal(await loginAccount({ email: owner.email, password: "WrongPass123!ab" }), null);
  });

  it("refuses a suspended account", async () => {
    const { owner } = await workspace();
    owner.status = "suspended";
    await owner.save();
    await assert.rejects(() => loginAccount({ email: owner.email, password }), (error) => error instanceof ApiError && error.statusCode === 403);
  });
});

describe("advance payments", () => {
  it("keeps an invoice partial until the advance covers the full amount", async () => {
    const { agency, client, actor } = await workspace();
    const invoice = await invoiceFor(agency, client, actor, 1000);
    await recordClientAdvance({ agencyId: agency._id, actor, data: { client: client._id, amount: 1000, currency: "BDT", method: "cash" } });

    const partial = await applyAdvanceToInvoice({ agencyId: agency._id, actor, invoiceId: invoice._id, amount: 400 });
    assert.equal(partial.applied, 400);
    assert.equal(partial.invoice.status, "Partial");
    assert.equal(partial.invoice.paidAmount, 400);
    assert.equal(partial.balance, 600);

    const paid = await applyAdvanceToInvoice({ agencyId: agency._id, actor, invoiceId: invoice._id, amount: 5000 });
    assert.equal(paid.applied, 600);
    assert.equal(paid.invoice.status, "Paid");
    assert.equal(paid.invoice.paidAmount, 1000);
    assert.equal(paid.balance, 0);
  });

  it("does not spend more advance than the account holds", async () => {
    const { agency, client, actor } = await workspace();
    const invoice = await invoiceFor(agency, client, actor, 200);
    await recordClientAdvance({ agencyId: agency._id, actor, data: { client: client._id, amount: 50, currency: "BDT", method: "cash" } });

    const result = await applyAdvanceToInvoice({ agencyId: agency._id, actor, invoiceId: invoice._id, amount: 200 });
    assert.equal(result.applied, 50);
    assert.equal(result.invoice.status, "Partial");
    assert.equal(result.balance, 0);
    const account = await PaymentAccount.findOne({ agency: agency._id, client: client._id });
    assert.equal(account.balance, 0);
    await assert.rejects(() => applyAdvanceToInvoice({ agencyId: agency._id, actor, invoiceId: invoice._id, amount: 10 }), (error) => error instanceof ApiError && error.statusCode === 409);
  });
});

describe("password change", () => {
  it("replaces the password only when the current one matches", async () => {
    const { owner } = await workspace();
    const nextPassword = "NextPass123!ab";
    await assert.rejects(() => changeAccountPassword({ userId: owner._id, currentPassword: "WrongPass123!ab", newPassword: nextPassword }), (error) => error instanceof ApiError && error.statusCode === 400);
    await changeAccountPassword({ userId: owner._id, currentPassword: password, newPassword: nextPassword });
    assert.equal(await loginAccount({ email: owner.email, password }), null);
    const signedIn = await loginAccount({ email: owner.email, password: nextPassword });
    assert.equal(String(signedIn.user._id), String(owner._id));
  });
});

describe("facebook token", () => {
  it("stores the token encrypted and still reads the original value", async () => {
    const { agency } = await workspace();
    const plain = "EAA-test-token-value";
    const saved = await ApiCredential.create({ agency: agency._id, accessToken: plain, isConnected: true });
    const raw = await ApiCredential.collection.findOne({ _id: saved._id });
    assert.equal(raw.accessToken.startsWith(TOKEN_PREFIX), true);
    assert.equal(raw.accessToken.includes(plain), false);
    const loaded = await ApiCredential.findById(saved._id).select("+accessToken");
    assert.equal(loaded.accessToken, plain);
  });

  it("encrypts a token that was saved as plain text", async () => {
    const { agency } = await workspace();
    const plain = "legacy-plain-token";
    const inserted = await ApiCredential.collection.insertOne({ agency: agency._id, provider: "facebook", accessToken: plain, isConnected: true, adAccounts: [], createdAt: new Date(), updatedAt: new Date() });
    const loaded = await ApiCredential.findById(inserted.insertedId).select("+accessToken");
    assert.equal(loaded.accessToken, plain);
    const raw = await ApiCredential.collection.findOne({ _id: inserted.insertedId });
    assert.equal(raw.accessToken.startsWith(TOKEN_PREFIX), true);
    assert.equal(raw.accessToken.includes(plain), false);
  });
});

describe("campaign unlink", () => {
  it("clears both the request and the client", async () => {
    const { agency, client, owner } = await workspace();
    const request = await AdRequest.create({
      agency: agency._id,
      client: client._id,
      submittedBy: owner._id,
      requestNumber: `REQ-LINK-${agency.slug}`,
      pageName: "Riaz Page",
      platform: ["facebook"],
      objectiveGroup: ["engagement"],
      objective: ["Reach"],
      budget: { amount: 20, type: "daily", currency: "BDT" },
      durationDays: 30,
      status: "Live",
    });
    const campaign = await Campaign.create({
      agency: agency._id,
      client: client._id,
      adRequest: request._id,
      source: "facebook",
      facebookCampaignId: "111",
      facebookAdAccountId: "act_222",
      name: "Launch campaign",
      platform: "facebook",
      status: "active",
    });

    const unlinked = await setCampaignRequestAssignment({ agencyId: agency._id, campaignId: campaign._id, adRequestId: null });
    assert.equal(unlinked.adRequest, null);
    assert.equal(unlinked.client, null);
    const stored = await Campaign.findById(campaign._id);
    assert.equal(stored.adRequest, null);
    assert.equal(stored.client, null);
  });
});
