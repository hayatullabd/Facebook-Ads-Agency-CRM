import mongoose from "mongoose";
import { env } from "./config/env.js";
import app, { startServer } from "./app.js";
import { runtimeState } from "./services/runtimeState.service.js";
import { stopFacebookSyncWorker } from "./services/facebookSyncJob.service.js";
import { stopSubscriptionRenewalJob } from "./jobs/subscriptionRenewal.job.js";

let server;
let shutdownPromise;
const isPortInUseError = (error) => error?.code === "EADDRINUSE";
const shutdown = (reason, exitCode) => {
  if (shutdownPromise) return shutdownPromise;

  shutdownPromise = (async () => {
    runtimeState.markShuttingDown();
    console.log(`${reason} received; shutting down`);

    const deadline = setTimeout(() => {
      console.error(`Graceful shutdown exceeded ${env.shutdownTimeoutMs}ms`);
      process.exit(1);
    }, env.shutdownTimeoutMs);
    deadline.unref();

    try {
      if (server) {
        if (typeof server.closeIdleConnections === "function") server.closeIdleConnections();
        await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      }
      await stopFacebookSyncWorker();
      await stopSubscriptionRenewalJob();
      await mongoose.disconnect();
      clearTimeout(deadline);
      process.exit(exitCode);
    } catch (error) {
      clearTimeout(deadline);
      console.error("Graceful shutdown failed:", error?.stack || error);
      process.exit(1);
    }
  })();

  return shutdownPromise;
};

const bootstrap = async () => {
  await startServer();
  try {
    server = app.listen(env.port, "0.0.0.0", () => {
      console.log(`Server running on 0.0.0.0:${env.port}`);
    });
    server.on("error", (error) => {
      console.error("Server failed to listen:", error?.stack || error);
      void shutdown("listen error", 1);
    });
  } catch (error) {
    if (isPortInUseError(error)) {
      throw new Error(`Port ${env.port} is already in use. Stop the existing process or set PORT to a free port.`);
    }
    throw error;
  }
};

process.on("SIGTERM", () => void shutdown("SIGTERM", 0));
process.on("SIGINT", () => void shutdown("SIGINT", 0));
process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error?.stack || error);
  void shutdown("unhandledRejection", 1);
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error?.stack || error);
  void shutdown("uncaughtException", 1);
});

bootstrap().catch(async (error) => {
  console.error("Server bootstrap failed:", error?.stack || error);
  runtimeState.markShuttingDown();
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});

