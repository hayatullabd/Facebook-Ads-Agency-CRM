import mongoose from "mongoose";
import { env } from "./config/env.js";
import app, { startServer } from "./app.js";
import { runtimeState } from "./services/runtimeState.service.js";

let server;
let shutdownPromise;

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
  server = app.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
  });
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
