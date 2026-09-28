import { Router } from "express";
import { addSubscriptionInvoice, assignAgencySubscriptionPlan, cancelAgencySubscription, collectSubscriptionInvoice, createAgencySubscription, createPlan, getPlans, getSubscriptionDashboard, getSubscriptionInvoices, getSubscriptions, removePlan, removeSubscriptionInvoice, resumeAgencySubscription, updatePlan } from "../controllers/subscription.controller.js";
import { PLATFORM_ROLES } from "../constants/roles.js";
import { agencyScopeMiddleware } from "../middlewares/agencyScope.middleware.js";
import { platformRoleMiddleware } from "../middlewares/platformRole.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { validateObjectIdParam } from "../validators/common.validator.js";
import { validateSubscriptionCreate, validateSubscriptionInvoiceCreate, validateSubscriptionPlanCreate, validateSubscriptionPlanUpdate } from "../validators/subscription.validator.js";

const router = Router({ mergeParams: true });

router.param("planId", validateObjectIdParam);
router.param("invoiceId", validateObjectIdParam);
router.get("/plans", getPlans);
router.post("/plans", platformRoleMiddleware(PLATFORM_ROLES.ADMIN), validateSubscriptionPlanCreate, createPlan);
router.patch("/plans/:planId", platformRoleMiddleware(PLATFORM_ROLES.ADMIN), validateSubscriptionPlanUpdate, updatePlan);
router.delete("/plans/:planId", platformRoleMiddleware(PLATFORM_ROLES.ADMIN), removePlan);
router.get("/invoices", platformRoleMiddleware(PLATFORM_ROLES.ADMIN), getSubscriptionInvoices);
router.post("/invoices", platformRoleMiddleware(PLATFORM_ROLES.ADMIN), validateSubscriptionInvoiceCreate, addSubscriptionInvoice);
router.post("/invoices/:invoiceId/paid", platformRoleMiddleware(PLATFORM_ROLES.ADMIN), collectSubscriptionInvoice);
router.delete("/invoices/:invoiceId", platformRoleMiddleware(PLATFORM_ROLES.ADMIN), removeSubscriptionInvoice);
router.use("/:agencyId", agencyScopeMiddleware);
router.get("/:agencyId", getSubscriptions);
router.post("/:agencyId", roleMiddleware("owner", "admin"), validateSubscriptionCreate, createAgencySubscription);
router.get("/:agencyId/summary", getSubscriptionDashboard);
router.patch("/:agencyId/:subscriptionId/plan", roleMiddleware("owner", "admin"), validateSubscriptionCreate, assignAgencySubscriptionPlan);
router.post("/:agencyId/:subscriptionId/cancel", roleMiddleware("owner", "admin"), cancelAgencySubscription);
router.post("/:agencyId/:subscriptionId/resume", roleMiddleware("owner", "admin"), resumeAgencySubscription);

export default router;
