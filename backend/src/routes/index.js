import { Router } from "express";
import authRoutes from "./auth.routes.js";
import agencyRoutes from "./agency.routes.js";
import clientRoutes from "./client.routes.js";
import adRequestRoutes from "./adRequest.routes.js";
import campaignRoutes from "./campaign.routes.js";
import invoiceRoutes from "./invoice.routes.js";
import updateRoutes from "./update.routes.js";
import activityLogRoutes from "./activityLog.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import userRoutes from "./user.routes.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

router.use("/auth", authRoutes);
router.use(authMiddleware);
router.use("/agency", agencyRoutes);
router.use("/users", userRoutes);
router.use("/clients", clientRoutes);
router.use("/requests", adRequestRoutes);
router.use("/campaigns", campaignRoutes);
router.use("/invoices", invoiceRoutes);
router.use("/updates", updateRoutes);
router.use("/logs", activityLogRoutes);
router.use("/dashboard", dashboardRoutes);

export default router;
