import { createHash } from "node:crypto";
import mongoose from "mongoose";
import Client from "../models/Client.model.js";
import Invoice from "../models/Invoice.model.js";
import PaymentAccount from "../models/PaymentAccount.model.js";
import PaymentTransaction from "../models/PaymentTransaction.model.js";
import { ApiError } from "../utils/ApiError.js";

const CLIENT_ROLES = ["client", "moderator"];
const accountFields = ["name", "provider", "accountReference", "currency", "status", "notes"];

const clientScope = (actor) => {
  if (!CLIENT_ROLES.includes(actor.role)) return null;
  if (!actor.client) throw new ApiError(403, "A client assignment is required");
  return actor.client;
};
const pickFields = (body, fields) => Object.fromEntries(
  fields.filter((field) => body[field] !== undefined).map((field) => [field, body[field]])
);

const assertClientInAgency = async (agencyId, clientId) => {
  if (!await Client.exists({ _id: clientId, agency: agencyId })) {
    throw new ApiError(400, "Client does not belong to this agency");
  }
};

const findAccount = async ({ agencyId, accountId, actor, session = null }) => {
  const query = { _id: accountId, agency: agencyId };
  const scopedClient = clientScope(actor);
  if (scopedClient) query.client = scopedClient;
  const accountQuery = PaymentAccount.findOne(query);
  if (session) accountQuery.session(session);
  const account = await accountQuery;
  if (!account) throw new ApiError(404, "Payment account not found");
  return account;
};

export const listPaymentAccounts = async ({ agencyId, actor }) => {
  const query = { agency: agencyId };
  const scopedClient = clientScope(actor);
  if (scopedClient) query.client = scopedClient;
  return PaymentAccount.find(query).populate("client", "name contactName").sort({ createdAt: -1 });
};

export const createPaymentAccount = async ({ agencyId, actor, data }) => {
  await assertClientInAgency(agencyId, data.client);
  const scopedClient = clientScope(actor);
  if (scopedClient && String(scopedClient) !== String(data.client)) {
    throw new ApiError(403, "You do not have access to this client");
  }
  return PaymentAccount.create({
    ...pickFields(data, [...accountFields, "client", "openingBalance"]),
    balance: data.openingBalance ?? 0,
    agency: agencyId,
  });
};

export const updatePaymentAccount = async ({ agencyId, accountId, actor, data }) => {
  const account = await findAccount({ agencyId, accountId, actor });
  if (data.currency && data.currency !== account.currency) throw new ApiError(409, "Account currency is immutable");
  Object.assign(account, pickFields(data, accountFields));
  await account.save();
  return account;
};

export const listPaymentTransactions = async ({ agencyId, actor, filters }) => {
  const query = { agency: agencyId };
  const scopedClient = clientScope(actor);
  if (scopedClient) query.client = scopedClient;
  if (filters.account) query.account = filters.account;
  if (filters.client && !scopedClient) query.client = filters.client;
  if (filters.type) query.type = filters.type;
  return PaymentTransaction.find(query)
    .populate("account", "name provider currency")
    .populate("client", "name contactName")
    .populate("invoice", "invoiceNumber status amount currency")
    .populate("createdBy", "name")
    .sort({ transactionDate: -1, createdAt: -1 });
};

export const createPaymentTransaction = async ({ agencyId, accountId, actor, data, forcedType }) => {
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(data.idempotencyKey || "")) throw new ApiError(400, "A valid idempotencyKey is required");
  if (!Number.isFinite(data.amount) || data.amount < 0.01 || data.amount > 1_000_000_000 || Math.abs(data.amount * 100 - Math.round(data.amount * 100)) > 0.00001) throw new ApiError(400, "Amount must use at most two decimal places");
  const type = forcedType || data.type;
  if (!["credit", "debit"].includes(type)) throw new ApiError(400, "Invalid transaction type");
  const requestHash = createHash("sha256").update(JSON.stringify([type, data.amount, data.invoice || null, data.method || "manual", data.reference || "", data.description || "", data.transactionDate || null])).digest("hex");
  const session = await mongoose.startSession();
  let transaction;
  try {
    await session.withTransaction(async () => {
      const account = await findAccount({ agencyId, accountId, actor, session });
      const existing = await PaymentTransaction.findOne({ agency: agencyId, account: account._id, idempotencyKey: data.idempotencyKey }).select("+requestHash").session(session);
      if (existing) {
        if (existing.requestHash !== requestHash) throw new ApiError(409, "Idempotency key was already used for a different payment");
        transaction = existing.toObject(); delete transaction.requestHash; return;
      }
      if (account.status !== "active") throw new ApiError(409, "Payment account is inactive");

      if (data.invoice) {
        const invoice = await Invoice.findOne({
          _id: data.invoice,
          agency: agencyId,
          client: account.client,
          currency: account.currency,
        }).session(session);
        if (!invoice) throw new ApiError(400, "Invoice does not match this account's agency, client, or currency");
        if (type !== "debit" || data.amount !== invoice.amount) throw new ApiError(400, "Invoice settlement requires a debit for the exact invoice amount");
        const settled = await Invoice.updateOne({ _id: invoice._id, status: { $ne: "Paid" } }, { $set: { status: "Paid", paidAt: new Date(), paymentMethod: data.method || "manual" } }, { session });
        if (!settled.modifiedCount) throw new ApiError(409, "Invoice is already paid");
      }

      const delta = type === "credit" ? data.amount : -data.amount;
      const balanceQuery = { _id: account._id, agency: agencyId };
      balanceQuery.balance = delta < 0 ? { $gte: data.amount } : { $lte: 1_000_000_000 - data.amount };
      const updatedAccount = await PaymentAccount.findOneAndUpdate(
        balanceQuery,
        [{ $set: { balance: { $round: [{ $add: ["$balance", delta] }, 2] } } }],
        { new: true, runValidators: true, session }
      );
      if (!updatedAccount) throw new ApiError(409, "Insufficient balance or account balance limit exceeded");

      [transaction] = await PaymentTransaction.create([{
        ...pickFields(data, ["invoice", "amount", "method", "reference", "description", "transactionDate"]),
        agency: agencyId,
        client: account.client,
        account: account._id,
        currency: account.currency,
        balance: updatedAccount.balance,
        idempotencyKey: data.idempotencyKey,
        requestHash,
        type,
        createdBy: actor._id,
      }], { session });
      transaction = transaction.toObject();
      delete transaction.requestHash;
    });
    return transaction;
  } finally {
    await session.endSession();
  }
};
