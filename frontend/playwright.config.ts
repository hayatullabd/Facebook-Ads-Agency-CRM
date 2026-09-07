import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: { baseURL: "http://127.0.0.1:5001", viewport: { width: 1440, height: 1000 }, trace: "retain-on-failure" },
  webServer: { command: "node ../backend/tests/serve.js", url: "http://127.0.0.1:5001/health/ready", timeout: 180000, reuseExistingServer: !process.env.CI },
  reporter: [["list"]],
});
