import mongoose from "mongoose";
import Client from "../models/Client.model.js";
import Invoice from "../models/Invoice.model.js";
import PaymentAccount from "../models/PaymentAccount.model.js";
import PaymentTransaction from "../models/PaymentTransaction.model.js";
import { ApiError } from "../utils/ApiError.js";

const CLIENT_ROLES = ["client", "moderator"];
const accountFields = ["name", "provider", "accountReference", "currency", "status", "notes"];

const clientScope = (actor) => CLIENT_ROLES.includes(actor.role) ? actor.client : null;
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
  const session = await mongoose.startSession();
  let transaction;
  try {
    await session.withTransaction(async () => {
      const account = await findAccount({ agencyId, accountId, actor, session });
      if (account.status !== "active") throw new ApiError(409, "Payment account is inactive");

      if (data.invoice) {
        const invoice = await Invoice.findOne({
          _id: data.invoice,
          agency: agencyId,
          client: account.client,
          currency: account.currency,
        }).session(session);
        if (!invoice) throw new ApiError(400, "Invoice does not match this account's agency, client, or currency");
      }

      const type = forcedType || data.type;
      const delta = type === "credit" ? data.amount : -data.amount;
      const balanceQuery = { _id: account._id, agency: agencyId };
      if (delta < 0) balanceQuery.balance = { $gte: data.amount };
      const updatedAccount = await PaymentAccount.findOneAndUpdate(
        balanceQuery,
        { $inc: { balance: delta } },
        { new: true, runValidators: true, session }
      );
      if (!updatedAccount) throw new ApiError(409, "Insufficient account balance");

      [transaction] = await PaymentTransaction.create([{
        ...pickFields(data, ["invoice", "amount", "method", "reference", "description", "transactionDate"]),
        agency: agencyId,
        client: account.client,
        account: account._id,
        currency: account.currency,
        type,
        createdBy: actor._id,
      }], { session });
      transaction = transaction.toObject();
      transaction.balance = updatedAccount.balance;
    });
    return transaction;
  } finally {
    await session.endSession();
  }
};
