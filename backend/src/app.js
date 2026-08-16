import { randomUUID } from "node:crypto";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import mongoose from "mongoose";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { apiRateLimiter } from "./middlewares/apiRateLimiter.middleware.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { securityHeaders } from "./middlewares/securityHeaders.middleware.js";
import { runtimeState } from "./services/runtimeState.service.js";
import { startFacebookSyncWorker } from "./services/facebookSyncJob.service.js";
import routes from "./routes/index.js";

const app = express();
const allowedOrigins = new Set(env.clientUrls);
const isAllowedOrigin = (origin) => {
  const normalizedOrigin = origin?.replace(/\/$/, "");
  const localOrigin = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(normalizedOrigin || "");
  return !origin || allowedOrigins.has(normalizedOrigin) || (!env.isProduction && localOrigin);
};

app.disable("x-powered-by");
if (env.trustProxy) app.set("trust proxy", 1);
app.use((req, res, next) => {
  const suppliedId = req.get("X-Request-ID")?.trim();
  req.id = suppliedId && suppliedId.length <= 128 ? suppliedId : randomUUID();
  res.set("X-Request-ID", req.id);
  next();
});
app.use(securityHeaders);
app.use((req, res, next) => {
  const origin = req.get("Origin");
  if (origin && !isAllowedOrigin(origin)) return res.status(403).json({ success: false, message: "Origin not allowed" });
  next();
});
app.use(cors({
  origin(origin, callback) { callback(null, isAllowedOrigin(origin)); },
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use(morgan(env.isProduction ? "combined" : "dev"));

app.get("/health/live", (_req, res) => {
  res.json({ success: true, status: "live" });
});

const readinessHandler = (_req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  const ready = runtimeState.isReady() && databaseConnected;
  res.status(ready ? 200 : 503).json({ success: ready, status: ready ? "ready" : "not-ready" });
};

app.get("/health/ready", readinessHandler);
app.get("/health", readinessHandler);

app.use("/api", apiRateLimiter, routes);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use(errorMiddleware);

export const startServer = async () => {
  await connectDB();
  runtimeState.markReady();
  try { startFacebookSyncWorker(); }
  catch (error) { console.error("Facebook sync worker failed to start:", error?.message || "unknown error"); }
  return app;
};

export default app;
