import { before, beforeEach, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import mongoose from "mongoose";
import request from "supertest";
import { createTestDatabase } from "./support/database.js";
process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/not_used";
process.env.JWT_SECRET = randomBytes(32).toString("hex");
process.env.CREDENTIAL_ENCRYPTION_KEY = randomBytes(32).toString("hex");
process.env.RATE_LIMIT_STORE = "mongo";
process.env.SERVE_FRONTEND = "false";
const { default: app } = await import("../src/app.js");
const { default: Agency } = await import("../src/models/Agency.model.js");
const { default: User } = await import("../src/models/User.model.js");
const { default: Client } = await import("../src/models/Client.model.js");
const { default: AdRequest } = await import("../src/models/AdRequest.model.js");
const { default: Invoice } = await import("../src/models/Invoice.model.js");
const { default: PaymentAccount } = await import("../src/models/PaymentAccount.model.js");
const { default: PaymentTransaction } = await import("../src/models/PaymentTransaction.model.js");
const { default: ApiCredential } = await import("../src/models/ApiCredential.model.js");
const { default: RateLimit } = await import("../src/models/RateLimit.model.js");
const { calculateInvoiceAmount } = await import("../src/services/billingCalculation.service.js");
const { decryptCredential, encryptCredential } = await import("../src/services/credentialEncryption.service.js");
const { createRateLimiter } = await import("../src/services/rateLimit.service.js");
const { verifyDatabaseReadiness } = await import("../src/services/databaseReadiness.service.js");
const password = `Aa1!${randomBytes(16).toString("hex")}`;
let database, agency, client, otherClient, owner, clientUser, ownerToken, clientToken;
const auth = token => ({ Authorization: `Bearer ${token}` });
async function login(user, pass = password) {
  const response = await request(app).post("/api/auth/login").send({ email: user.email, password: pass });
  assert.equal(response.status, 200, response.text);
  assert.equal(response.body.data.user.password, undefined);
  assert.equal(response.body.data.user.tokenVersion, undefined);
  return response.body.data.token;
}
before(async () => {
  database = await createTestDatabase();
  await mongoose.connect(database.uri);
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
}, { timeout: 180000 });
beforeEach(async () => {
  await Promise.all(Object.values(mongoose.models).map(model => model.deleteMany({})));
  agency = await Agency.create({ name: "Test Agency", slug: "test-agency", defaultCurrency: "BDT", defaultRate: 110 });
  client = await Client.create({ agency: agency._id, name: "Client One", contactName: "Contact One", email: "client1@example.test", billingRate: 110 });
  otherClient = await Client.create({ agency: agency._id, name: "Client Two", contactName: "Contact Two", email: "client2@example.test" });
  owner = await User.create({ agency: agency._id, name: "Test Owner", email: "owner@example.test", password, role: "owner", platformRole: "admin" });
  clientUser = await User.create({ agency: agency._id, client: client._id, name: "Client User", email: "user@example.test", password, role: "client" });
  agency.owner = owner._id; await agency.save();
  ownerToken = await login(owner); clientToken = await login(clientUser);
});
after(async () => { await mongoose.disconnect(); await database?.stop(); });
const createRequest = (type = "lifetime") => AdRequest.create({ agency: agency._id, client: client._id, submittedBy: owner._id, requestNumber: randomUUID(), pageName: "Test Page", platform: ["facebook"], objectiveGroup: "website", objective: "Traffic", budget: { amount: 100, type, currency: "USD" }, durationDays: 10, status: "Approved" });

test("health, CORS, request IDs and malformed JSON", async () => {
  await request(app).get("/health/live").expect(200);
  await request(app).get("/health/ready").expect(503);
  await request(app).get("/health/live").set("Origin", "https://untrusted.example").expect(403);
  const response = await request(app).post("/api/auth/login").set("Content-Type", "application/json").send('{"broken":').expect(400);
  assert.equal(response.body.message, "Invalid JSON request body");
  assert.ok(response.headers["x-request-id"]);
  assert.equal(response.headers["x-content-type-options"], "nosniff");
});
test("owner sessions are valid, private fields hidden and logout revokes tokens", async () => {
  const me = await request(app).get("/api/auth/me").set(auth(ownerToken)).expect(200);
  assert.equal(me.body.data.role, "owner"); assert.equal(me.body.data.tokenVersion, undefined);
  await request(app).get(`/api/clients/${agency.id}`).set(auth(ownerToken)).expect(200);
  await request(app).post("/api/auth/logout").set(auth(ownerToken)).expect(200);
  await request(app).get("/api/auth/me").set(auth(ownerToken)).expect(401);
});
test("changing a password revokes existing tokens", async () => {
  const next = `Bb2!${randomBytes(16).toString("hex")}`;
  await request(app).post("/api/auth/password").set(auth(ownerToken)).send({ currentPassword: password, newPassword: next }).expect(200);
  await request(app).get("/api/auth/me").set(auth(ownerToken)).expect(401);
  await login(owner, next);
});
test("tenant and client isolation, including accounts without a client assignment", async () => {
  const otherAgency = await Agency.create({ name: "Other Agency", slug: "other" });
  await request(app).get(`/api/clients/${otherAgency.id}`).set(auth(ownerToken)).expect(403);
  await request(app).get("/api/clients/not-an-id").set(auth(ownerToken)).expect(400);
  const response = await request(app).get(`/api/clients/${agency.id}`).set(auth(clientToken)).expect(200);
  assert.deepEqual(response.body.data.map(row => row._id), [client.id]);
  await request(app).post(`/api/clients/${agency.id}`).set(auth(clientToken)).send({ name: "Injected" }).expect(403);
  await User.updateOne({ _id: clientUser._id }, { $set: { client: null } });
  await request(app).get(`/api/payments/${agency.id}/accounts`).set(auth(clientToken)).expect(403);
  await request(app).get(`/api/agency/${agency.id}/facebook-accounts`).set(auth(clientToken)).expect(403);
});
test("client validation rejects null fields and foreign team references", async () => {
  await request(app).patch(`/api/clients/${agency.id}/${client.id}`).set(auth(ownerToken)).send({ billingRate: null }).expect(400);
  await request(app).patch(`/api/clients/${agency.id}/${client.id}`).set(auth(ownerToken)).send({ assignedTeamMembers: [new mongoose.Types.ObjectId().toString()] }).expect(400);
  await request(app).patch(`/api/clients/${agency.id}/${client.id}`).set(auth(ownerToken)).send({ name: "Updated Client" }).expect(200);
});
test("workspace registration and platform approval complete atomically", async () => {
  const response = await request(app).post("/api/auth/register").send({ agencyName: "New Workspace", name: "New Owner", email: "new@example.test", password }).expect(202);
  const id = response.body.data.agency._id;
  await request(app).post("/api/auth/login").send({ email: "new@example.test", password }).expect(403);
  await request(app).post(`/api/approvals/workspaces/${id}/approve`).set(auth(clientToken)).send({}).expect(403);
  await request(app).post(`/api/approvals/workspaces/${id}/approve`).set(auth(ownerToken)).send({}).expect(200);
  await login({ email: "new@example.test" });
  await request(app).post(`/api/approvals/workspaces/${id}/reject`).set(auth(ownerToken)).send({}).expect(409);
});
test("join request cannot be activated through user editing", async () => {
  const response = await request(app).post("/api/auth/register").send({ mode: "join", agencyName: agency.slug, name: "Joining User", email: "join@example.test", password }).expect(202);
  const id = response.body.data.user._id;
  await request(app).patch(`/api/users/${agency.id}/${id}`).set(auth(ownerToken)).send({ isActive: true, client: client.id }).expect(409);
  await request(app).post(`/api/approvals/users/${agency.id}/${id}/approve`).set(auth(ownerToken)).send({ role: "client", client: client.id }).expect(200);
  await login({ email: "join@example.test" });
});
test("lifetime and daily budgets use correct duration and currency", async () => {
  assert.equal(calculateInvoiceAmount({ amount: 100, type: "daily" }, 10, 110), 110000);
  assert.equal(calculateInvoiceAmount({ amount: 100, type: "lifetime" }, 10, 110), 11000);
  assert.throws(() => calculateInvoiceAmount({ amount: Infinity, type: "daily" }, 1, 1));
  const ad = await createRequest();
  const response = await request(app).post(`/api/invoices/${agency.id}`).set(auth(ownerToken)).send({ client: client.id, adRequest: ad.id, dueDate: "2027-01-01", notes: "Preserve this" }).expect(201);
  assert.equal(response.body.data.amount, 11000); assert.equal(response.body.data.currency, "BDT");
  assert.equal(response.body.data.notes, "Preserve this");
});
test("parallel invoice creation yields one invoice and conflict", async () => {
  const ad = await createRequest();
  const responses = await Promise.all([1, 2].map(() => request(app).post(`/api/invoices/${agency.id}`).set(auth(ownerToken)).send({ client: client.id, adRequest: ad.id, dueDate: "2027-01-01" })));
  assert.deepEqual(responses.map(response => response.status).sort(), [201, 409]);
  assert.equal(await Invoice.countDocuments({ adRequest: ad._id }), 1);
});
test("paid invoices are immutable and overdue invoices are identified", async () => {
  const ad = await createRequest();
  const { body } = await request(app).post(`/api/invoices/${agency.id}`).set(auth(ownerToken)).send({ client: client.id, adRequest: ad.id, dueDate: "2020-01-01" }).expect(201);
  const url = `/api/invoices/${agency.id}/${body.data._id}`;
  const list = await request(app).get(`/api/invoices/${agency.id}`).set(auth(ownerToken)).expect(200);
  assert.equal(list.body.data[0].status, "Overdue");
  await request(app).patch(`${url}/paid`).set(auth(ownerToken)).send({ paymentMethod: "manual" }).expect(200);
  await request(app).patch(url).set(auth(ownerToken)).send({ notes: "edit" }).expect(409);
  await request(app).delete(url).set(auth(ownerToken)).expect(409);
});
test("payments preserve historical balances and replay safely", async () => {
  const account = await PaymentAccount.create({ agency: agency._id, client: client._id, name: "Client Wallet", currency: "BDT", balance: 100 });
  const url = `/api/payments/${agency.id}/transactions`;
  const payload = { account: account.id, type: "debit", amount: 25, idempotencyKey: randomUUID() };
  const first = await request(app).post(url).set(auth(ownerToken)).send(payload).expect(201);
  const replay = await request(app).post(url).set(auth(ownerToken)).send(payload).expect(201);
  assert.equal(first.body.data._id, replay.body.data._id);
  assert.equal(first.body.data.balance, 75); assert.equal(first.body.data.requestHash, undefined);
  await request(app).post(url).set(auth(ownerToken)).send({ ...payload, amount: 30 }).expect(409);
  await request(app).post(url).set(auth(ownerToken)).send({ ...payload, amount: 100, idempotencyKey: randomUUID() }).expect(409);
  assert.equal((await PaymentAccount.findById(account.id)).balance, 75);
  const list = await request(app).get(url).set(auth(clientToken)).expect(200);
  assert.equal(list.body.data[0].balance, 75);
  assert.equal(await PaymentTransaction.countDocuments(), 1);
});
test("concurrent debits cannot overdraw an account", async () => {
  const account = await PaymentAccount.create({ agency: agency._id, client: client._id, name: "Wallet", currency: "BDT", balance: 100 });
  const responses = await Promise.all([1, 2].map(() => request(app).post(`/api/payments/${agency.id}/transactions`).set(auth(ownerToken)).send({ account: account.id, type: "debit", amount: 75, idempotencyKey: randomUUID() })));
  assert.deepEqual(responses.map(response => response.status).sort(), [201, 409]);
  assert.equal((await PaymentAccount.findById(account.id)).balance, 25);
});
test("clients with financial records cannot be deleted", async () => {
  await PaymentAccount.create({ agency: agency._id, client: otherClient._id, name: "Retained Wallet", currency: "BDT" });
  await request(app).delete(`/api/clients/${agency.id}/${otherClient.id}`).set(auth(ownerToken)).expect(409);
});
test("Facebook credentials are encrypted at rest and decrypt for server use only", async () => {
  const token = "test-facebook-access-token";
  await ApiCredential.findOneAndUpdate({ agency: agency._id }, { $set: { accessToken: token } }, { upsert: true });
  const raw = await ApiCredential.collection.findOne({ agency: agency._id });
  assert.ok(raw.accessToken.startsWith("enc:v1:")); assert.notEqual(raw.accessToken, token);
  assert.equal((await ApiCredential.findOne({ agency: agency._id }).select("+accessToken")).accessToken, token);
  assert.equal((await ApiCredential.findOne({ agency: agency._id })).toObject().accessToken, undefined);
  const encrypted = encryptCredential(token);
  const parts = encrypted.split(":"); parts[4] = Buffer.from("tampered").toString("base64");
  assert.throws(() => decryptCredential(parts.join(":")));
});
test("shared rate limiting enforces one counter across middleware instances", async () => {
  const one = createRateLimiter("test", 2); const two = createRateLimiter("test", 2);
  const statuses = [];
  const run = fn => new Promise((resolve, reject) => {
    const res = { set() {}, status(code) { statuses.push(code); return this; }, json() { resolve(); } };
    void fn({ ip: "127.0.0.2" }, res, error => error ? reject(error) : resolve());
  });
  await run(one); await run(two); await run(one);
  assert.deepEqual(statuses, [429]);
});
test("replica set readiness verifies transaction prerequisites", async () => {
  await verifyDatabaseReadiness();
});
