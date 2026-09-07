import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
const credentials = () => JSON.parse(readFileSync(new URL("../../.cache/e2e-session.json", import.meta.url), "utf8"));
async function login(page: Page, client = false) {
  const data = credentials();
  await page.goto("/");
  await page.getByLabel("Email address").fill(client ? data.clientEmail : data.email);
  await page.getByLabel("Password", { exact: true }).fill(data.password);
  await page.getByRole("button", { name: "Sign In", exact: true }).last().click();
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByText("Some workspace data could not load:", { exact: false })).toHaveCount(0);
}

test("owner can load every workspace page and survive a direct refresh", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await login(page);
  for (const route of ["clients", "requests", "campaigns", "adaccounts", "billing", "payment_details", "planner", "updates", "users", "approvals", "profile", "settings"]) {
    await page.goto(`/${route}`);
    await expect(page.locator("header h1")).toBeVisible();
    await expect(page.getByText("This page could not load", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Invalid session response", { exact: true })).toHaveCount(0);
  }
  await page.reload();
  await expect(page.getByRole("heading", { name: "Agency Profile", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("owner creates a wallet and records a payment through the UI", async ({ page }) => {
  await login(page);
  await page.goto("/payment_details");
  await page.getByRole("button", { name: "New payment account" }).click();
  await page.getByLabel("Client", { exact: true }).selectOption(credentials().client);
  await page.getByLabel("Account name").fill("Browser Wallet");
  await page.getByLabel("Opening balance").fill("100");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Payment account created.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Record transaction" })).toBeEnabled();
  await page.getByRole("button", { name: "Record transaction" }).click();
  await page.getByLabel("Payment account", { exact: true }).selectOption({ label: "Browser Wallet · BDT" });
  await page.getByLabel("Amount", { exact: true }).fill("25");
  await page.getByLabel("Reference", { exact: true }).fill("Browser payment");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Transaction recorded successfully.")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Browser payment", exact: true })).toBeVisible();
});

test("mobile client view is scoped and hides financial management", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, true);
  await page.goto("/payment_details");
  await expect(page.locator("header h1")).toContainText("Payment Details");
  await expect(page.getByRole("button", { name: "New payment account" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.goto("/settings");
  await expect(page).toHaveURL(/dashboard/);
});

test("logout clears the local session and revokes its API token", async ({ page, request }) => {
  await login(page);
  const token = await page.evaluate(() => localStorage.getItem("adflow_token"));
  await page.getByRole("button", { name: /sign out|log out|logout/i }).click();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("adflow_token"))).toBeNull();
  const response = await request.get("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
  expect(response.status()).toBe(401);
});
