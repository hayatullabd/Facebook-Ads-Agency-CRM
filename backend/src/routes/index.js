import { Router } from "express";
import authRoutes from "./auth.routes.js";
import agencyRoutes from "./agency.routes.js";
import clientRoutes from "./client.routes.js";
import adRequestRoutes from "./adRequest.routes.js";
import campaignRoutes from "./campaign.routes.js";
import invoiceRoutes from "./invoice.routes.js";
import paymentRoutes from "./payment.routes.js";
import updateRoutes from "./update.routes.js";
import activityLogRoutes from "./activityLog.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import userRoutes from "./user.routes.js";
import commentRoutes from "./comment.routes.js";
import attachmentRoutes from "./attachment.routes.js";
import approvalRoutes from "./approval.routes.js";
import accessRoutes from "./access.routes.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

router.use("/auth", authRoutes);
router.use(authMiddleware);
router.use("/approvals", approvalRoutes);
router.use("/access", accessRoutes);
router.use("/agency", agencyRoutes);
router.use("/users", userRoutes);
router.use("/clients", clientRoutes);
router.use("/requests", adRequestRoutes);
router.use("/comments", commentRoutes);
router.use("/attachments", attachmentRoutes);
router.use("/campaigns", campaignRoutes);
router.use("/invoices", invoiceRoutes);
router.use("/payments", paymentRoutes);
router.use("/updates", updateRoutes);
router.use("/logs", activityLogRoutes);
router.use("/audit-logs", activityLogRoutes);
router.use("/dashboard", dashboardRoutes);

export default router;
