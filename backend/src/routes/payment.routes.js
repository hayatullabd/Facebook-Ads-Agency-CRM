import { Router } from "express";
import {
  applyAdvance,
  createAdjustment,
  createDeposit,
  createPaymentAccount,
  createPaymentTransaction,
  getPaymentAccounts,
  getPaymentTransactions,
  downloadPaymentScreenshot,
  recordAdvance,
  updatePayment,
  updatePaymentAccount,
} from "../controllers/payment.controller.js";
import { agencyScopeMiddleware } from "../middlewares/agencyScope.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { validateObjectIdParam } from "../validators/common.validator.js";
import {
  validateAdvanceApply,
  validateClientAdvanceCreate,
  validateClientPaymentUpdate,
  validatePaymentAccountCreate,
  validatePaymentAccountUpdate,
  validatePaymentAdjustmentCreate,
  validatePaymentDepositCreate,
  validatePaymentTransactionCreate,
  validatePaymentTransactionQuery,
} from "../validators/payment.validator.js";

const router = Router({ mergeParams: true });
router.param("accountId", validateObjectIdParam);
router.param("transactionId", validateObjectIdParam);
router.use("/:agencyId", agencyScopeMiddleware);

router.post("/:agencyId/advances", roleMiddleware("admin", "team", "client"), validateClientAdvanceCreate, recordAdvance);
router.post("/:agencyId/advances/apply", roleMiddleware("admin", "team", "client"), validateAdvanceApply, applyAdvance);
router.get("/:agencyId/accounts", getPaymentAccounts);
router.post("/:agencyId/accounts", roleMiddleware("admin", "team"), validatePaymentAccountCreate, createPaymentAccount);
router.patch("/:agencyId/accounts/:accountId", roleMiddleware("admin", "team"), validatePaymentAccountUpdate, updatePaymentAccount);
router.post("/:agencyId/accounts/:accountId/deposits", roleMiddleware("admin", "team"), validatePaymentDepositCreate, createDeposit);
router.post("/:agencyId/accounts/:accountId/adjustments", roleMiddleware("admin"), validatePaymentAdjustmentCreate, createAdjustment);
router.get("/:agencyId/transactions/:transactionId/screenshot", downloadPaymentScreenshot);
router.patch("/:agencyId/transactions/:transactionId", roleMiddleware("admin", "team", "client"), validateClientPaymentUpdate, updatePayment);
router.get("/:agencyId/transactions", validatePaymentTransactionQuery, getPaymentTransactions);
router.post("/:agencyId/transactions", roleMiddleware("admin", "team"), validatePaymentTransactionCreate, createPaymentTransaction);

export default router;
