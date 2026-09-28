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
  return PaymentAccount.find(query).populate("client", "name contactName").sort({ createdAt: -1 }).limit(1000).lean();
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
    .select("-screenshot")
    .populate("account", "name provider currency")
    .populate("client", "name contactName")
    .populate("invoice", "invoiceNumber status amount currency")
    .populate("createdBy", "name")
    .sort({ transactionDate: -1, createdAt: -1 })
    .limit(3000)
    .lean();
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
        ...pickFields(data, ["invoice", "amount", "method", "reference", "description", "transactionDate", "screenshot"]),
        agency: agencyId,
        client: account.client,
        account: account._id,
        currency: account.currency,
        type,
        hasScreenshot: Boolean(data.screenshot),
        createdBy: actor._id,
      }], { session });
      transaction = transaction.toObject();
      delete transaction.screenshot;
      transaction.balance = updatedAccount.balance;
    });
    return transaction;
  } finally {
    await session.endSession();
  }
};

const advanceAccountName = (currency) => `Advance ${currency}`;

export const recordClientAdvance = async ({ agencyId, actor, data }) => {
  const clientId = CLIENT_ROLES.includes(actor.role) ? actor.client : data.client;
  if (!clientId) throw new ApiError(400, "Client is required");
  await assertClientInAgency(agencyId, clientId);
  const client = await Client.findOne({ _id: clientId, agency: agencyId }).select("billingCurrency");
  if (!client) throw new ApiError(404, "Client not found");
  const currency = data.currency || client.billingCurrency || "BDT";
  const name = advanceAccountName(currency);
  let account = await PaymentAccount.findOne({ agency: agencyId, client: clientId, name });
  if (!account) {
    try {
      account = await PaymentAccount.create({
        agency: agencyId,
        client: clientId,
        name,
        provider: "advance",
        currency,
        openingBalance: 0,
        balance: 0,
        status: "active",
      });
    } catch (error) {
      if (error?.code !== 11000) throw error;
      account = await PaymentAccount.findOne({ agency: agencyId, client: clientId, name });
    }
  }
  if (!account) throw new ApiError(500, "Advance account could not be created");
  if (account.status !== "active") {
    account.status = "active";
    await account.save();
  }
  return createPaymentTransaction({
    agencyId,
    accountId: account._id,
    actor,
    forcedType: "credit",
    data: {
      amount: data.amount,
      method: data.method || "cash",
      reference: data.reference || "",
      description: data.description || "Advance payment",
      transactionDate: data.transactionDate,
      screenshot: data.screenshot,
    },
  });
};

export const applyAdvanceToInvoice = async ({ agencyId, actor, invoiceId, amount }) => {
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const invoice = await Invoice.findOne({ _id: invoiceId, agency: agencyId }).session(session);
      if (!invoice) throw new ApiError(404, "Invoice not found");
      const scopedClient = clientScope(actor);
      if (scopedClient && String(scopedClient) !== String(invoice.client)) {
        throw new ApiError(403, "You do not have access to this client");
      }
      if (invoice.status === "Paid") throw new ApiError(409, "Invoice is already paid");
      const paidAmount = Number(invoice.paidAmount) || 0;
      const remaining = Math.round((Number(invoice.amount) - paidAmount) * 100) / 100;
      if (remaining < 0.01) throw new ApiError(409, "Invoice has no balance due");

      const account = await PaymentAccount.findOne({
        agency: agencyId,
        client: invoice.client,
        name: advanceAccountName(invoice.currency),
        currency: invoice.currency,
        status: "active",
      }).session(session);
      if (!account || account.balance < 0.01) throw new ApiError(409, "No advance balance in this invoice currency");

      const requested = amount == null ? remaining : Number(amount);
      const applied = Math.round(Math.min(requested, remaining, account.balance) * 100) / 100;
      if (applied < 0.01) throw new ApiError(400, "Amount must be greater than zero");

      const updatedAccount = await PaymentAccount.findOneAndUpdate(
        { _id: account._id, agency: agencyId, balance: { $gte: applied } },
        { $inc: { balance: -applied } },
        { new: true, session }
      );
      if (!updatedAccount) throw new ApiError(409, "Insufficient advance balance");

      const nextPaid = Math.round((paidAmount + applied) * 100) / 100;
      const fullyPaid = nextPaid + 0.009 >= Number(invoice.amount);
      const updatedInvoice = await Invoice.findOneAndUpdate(
        { _id: invoice._id, agency: agencyId, status: { $ne: "Paid" } },
        {
          paidAmount: fullyPaid ? invoice.amount : nextPaid,
          ...(fullyPaid ? { status: "Paid", paidAt: new Date(), paymentMethod: "advance" } : { status: "Partial", paymentMethod: "advance" }),
        },
        { new: true, session }
      );
      if (!updatedInvoice) throw new ApiError(409, "Invoice is already paid");

      await PaymentTransaction.create([{
        agency: agencyId,
        client: invoice.client,
        account: account._id,
        invoice: invoice._id,
        type: "debit",
        amount: applied,
        currency: invoice.currency,
        method: "manual",
        reference: invoice.invoiceNumber,
        description: `Advance applied to ${invoice.invoiceNumber}`,
        createdBy: actor._id,
      }], { session });

      result = { invoice: updatedInvoice, applied, balance: updatedAccount.balance };
    });
    return result;
  } finally {
    await session.endSession();
  }
};

export const updateClientPayment = async ({ agencyId, transactionId, actor, data }) => {
  const session = await mongoose.startSession();
  let transaction;
  try {
    await session.withTransaction(async () => {
      const query = { _id: transactionId, agency: agencyId, type: "credit" };
      const scopedClient = clientScope(actor);
      if (scopedClient) query.client = scopedClient;
      const existing = await PaymentTransaction.findOne(query).session(session);
      if (!existing) throw new ApiError(404, "Payment not found");

      if (data.amount != null) {
        const nextAmount = Math.round(Number(data.amount) * 100) / 100;
        const delta = Math.round((nextAmount - existing.amount) * 100) / 100;
        if (delta !== 0) {
          const balanceQuery = { _id: existing.account, agency: agencyId };
          if (delta < 0) balanceQuery.balance = { $gte: Math.abs(delta) };
          const updatedAccount = await PaymentAccount.findOneAndUpdate(
            balanceQuery,
            { $inc: { balance: delta } },
            { new: true, session }
          );
          if (!updatedAccount) throw new ApiError(409, "This amount is already used on an invoice. You can only reduce the unused advance.");
          existing.amount = nextAmount;
        }
      }
      if (data.method) existing.method = data.method;
      if (data.reference !== undefined) existing.reference = String(data.reference || "").trim();
      if (data.description !== undefined) existing.description = String(data.description || "").trim();
      if (data.transactionDate) existing.transactionDate = new Date(data.transactionDate);
      if (data.screenshot) {
        existing.screenshot = data.screenshot;
        existing.hasScreenshot = true;
      }
      await existing.save({ session });
      transaction = existing.toObject();
      delete transaction.screenshot;
    });
    return transaction;
  } finally {
    await session.endSession();
  }
};

export const getPaymentScreenshot = async ({ agencyId, transactionId, actor }) => {
  const query = { _id: transactionId, agency: agencyId };
  const scopedClient = clientScope(actor);
  if (scopedClient) query.client = scopedClient;
  const transaction = await PaymentTransaction.findOne(query).select("screenshot hasScreenshot");
  if (!transaction?.screenshot) throw new ApiError(404, "Screenshot not found");
  const matched = transaction.screenshot.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!matched) throw new ApiError(404, "Screenshot not found");
  return { contentType: matched[1], body: Buffer.from(matched[2], "base64") };
};
