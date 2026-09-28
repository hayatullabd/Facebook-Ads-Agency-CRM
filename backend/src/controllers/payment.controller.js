import {
  applyAdvanceToInvoice,
  createPaymentAccount as createAccount,
  createPaymentTransaction as createTransaction,
  listPaymentAccounts,
  listPaymentTransactions,
  recordClientAdvance,
  updateClientPayment,
  getPaymentScreenshot,
  updatePaymentAccount as updateAccount,
} from "../services/payment.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getPaymentAccounts = asyncHandler(async (req, res) => {
  const accounts = await listPaymentAccounts({ agencyId: req.params.agencyId, actor: req.user });
  res.json(new ApiResponse(200, accounts));
});

export const createPaymentAccount = asyncHandler(async (req, res) => {
  const account = await createAccount({ agencyId: req.params.agencyId, actor: req.user, data: req.body });
  res.status(201).json(new ApiResponse(201, account, "Payment account created"));
});

export const updatePaymentAccount = asyncHandler(async (req, res) => {
  const account = await updateAccount({
    agencyId: req.params.agencyId,
    accountId: req.params.accountId,
    actor: req.user,
    data: req.body,
  });
  res.json(new ApiResponse(200, account, "Payment account updated"));
});

export const getPaymentTransactions = asyncHandler(async (req, res) => {
  const transactions = await listPaymentTransactions({
    agencyId: req.params.agencyId,
    actor: req.user,
    filters: req.query,
  });
  res.json(new ApiResponse(200, transactions));
});

export const downloadPaymentScreenshot = asyncHandler(async (req, res) => {
  const screenshot = await getPaymentScreenshot({
    agencyId: req.params.agencyId,
    transactionId: req.params.transactionId,
    actor: req.user,
  });
  res.set("Content-Type", screenshot.contentType);
  res.set("Content-Disposition", "inline");
  res.set("Cache-Control", "private, max-age=3600");
  res.send(screenshot.body);
});

const sendTransaction = (forcedType, message) => asyncHandler(async (req, res) => {
  const transaction = await createTransaction({
    agencyId: req.params.agencyId,
    accountId: req.params.accountId || req.body.account,
    actor: req.user,
    data: req.body,
    forcedType,
  });
  res.status(201).json(new ApiResponse(201, transaction, message));
});

export const createPaymentTransaction = sendTransaction(undefined, "Payment transaction created");
export const createDeposit = sendTransaction("credit", "Deposit recorded");
export const createAdjustment = sendTransaction(undefined, "Balance adjustment recorded");

export const recordAdvance = asyncHandler(async (req, res) => {
  const transaction = await recordClientAdvance({ agencyId: req.params.agencyId, actor: req.user, data: req.body });
  res.status(201).json(new ApiResponse(201, transaction, "Advance payment recorded"));
});

export const updatePayment = asyncHandler(async (req, res) => {
  const transaction = await updateClientPayment({
    agencyId: req.params.agencyId,
    transactionId: req.params.transactionId,
    actor: req.user,
    data: req.body,
  });
  res.json(new ApiResponse(200, transaction, "Payment updated"));
});

export const applyAdvance = asyncHandler(async (req, res) => {
  const result = await applyAdvanceToInvoice({
    agencyId: req.params.agencyId,
    actor: req.user,
    invoiceId: req.body.invoice,
    amount: req.body.amount,
  });
  res.json(new ApiResponse(200, result, "Advance applied to invoice"));
});
