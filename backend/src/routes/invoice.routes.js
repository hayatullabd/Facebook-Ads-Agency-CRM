import { Router } from "express";
import { createInvoice, deleteInvoice, getInvoices, markInvoicePaid, updateInvoice } from "../controllers/invoice.controller.js";
import { agencyScopeMiddleware } from "../middlewares/agencyScope.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { validateInvoiceCreate, validateInvoiceUpdate, validatePayment } from "../validators/invoice.validator.js";
import { validateObjectIdParam } from "../validators/common.validator.js";

const router = Router({ mergeParams: true });
router.param("invoiceId", validateObjectIdParam);

router.use("/:agencyId", agencyScopeMiddleware);
router.get("/:agencyId", getInvoices);
router.post("/:agencyId", roleMiddleware("admin", "team"), validateInvoiceCreate, createInvoice);
router.patch("/:agencyId/:invoiceId/paid", roleMiddleware("admin", "team"), validatePayment, markInvoicePaid);
router.patch("/:agencyId/:invoiceId", roleMiddleware("admin", "team"), validateInvoiceUpdate, updateInvoice);
router.delete("/:agencyId/:invoiceId", roleMiddleware("admin", "team"), deleteInvoice);

export default router;
