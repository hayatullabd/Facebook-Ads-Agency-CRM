import { Router } from "express";
import {
  createAdjustment,
  createDeposit,
  createPaymentAccount,
  createPaymentTransaction,
  getPaymentAccounts,
  getPaymentTransactions,
  updatePaymentAccount,
} from "../controllers/payment.controller.js";
import { agencyScopeMiddleware } from "../middlewares/agencyScope.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { validateObjectIdParam } from "../validators/common.validator.js";
import {
  validatePaymentAccountCreate,
  validatePaymentAccountUpdate,
  validatePaymentAdjustmentCreate,
  validatePaymentDepositCreate,
  validatePaymentTransactionCreate,
  validatePaymentTransactionQuery,
} from "../validators/payment.validator.js";

const router = Router({ mergeParams: true });
router.param("accountId", validateObjectIdParam);
router.use("/:agencyId", agencyScopeMiddleware);

router.get("/:agencyId/accounts", getPaymentAccounts);
router.post("/:agencyId/accounts", roleMiddleware("admin", "team"), validatePaymentAccountCreate, createPaymentAccount);
router.patch("/:agencyId/accounts/:accountId", roleMiddleware("admin", "team"), validatePaymentAccountUpdate, updatePaymentAccount);
router.post("/:agencyId/accounts/:accountId/deposits", roleMiddleware("admin", "team"), validatePaymentDepositCreate, createDeposit);
router.post("/:agencyId/accounts/:accountId/adjustments", roleMiddleware("admin"), validatePaymentAdjustmentCreate, createAdjustment);
router.get("/:agencyId/transactions", validatePaymentTransactionQuery, getPaymentTransactions);
router.post("/:agencyId/transactions", roleMiddleware("admin", "team"), validatePaymentTransactionCreate, createPaymentTransaction);

export default router;
