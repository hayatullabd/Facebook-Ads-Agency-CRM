import { Router } from "express";
import { createInvoice, getInvoices, markInvoicePaid } from "../controllers/invoice.controller.js";
import { agencyScopeMiddleware } from "../middlewares/agencyScope.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";

const router = Router({ mergeParams: true });

router.use("/:agencyId", agencyScopeMiddleware);
router.get("/:agencyId", getInvoices);
router.post("/:agencyId", roleMiddleware("admin", "team"), createInvoice);
router.patch("/:agencyId/:invoiceId/paid", roleMiddleware("admin", "team"), markInvoicePaid);

export default router;
