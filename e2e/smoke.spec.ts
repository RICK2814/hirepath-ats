import { test, expect } from "@playwright/test";

test("careers page is public and lists open roles", async ({ page }) => {
  const response = await page.goto("/careers");
  expect(response?.ok()).toBeTruthy();
  await expect(page.locator("body")).not.toContainText("Cannot GET");
});

test("API requires authentication for recruiter data", async ({ request }) => {
  const response = await request.get("/api/candidates");
  expect(response.status()).toBe(401);
});

test("health endpoint reports ready", async ({ request }) => {
  const response = await request.get("/health");
  expect(response.ok()).toBeTruthy();
});


test("public careers form opens for a listed role", async ({ page }) => {
  await page.goto("/careers");
  const apply = page.getByRole("button", { name: "Apply" }).first();
  await expect(apply).toBeVisible();
  await apply.click();
  await expect(page.getByLabel("Full name")).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.locator("#consent")).toBeVisible();
});

test("recruiter can search candidates by semantic similarity", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Email").fill("admin@ats.dev");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("link", { name: /Candidates/ }).click();
  await expect(page.getByRole("button", { name: "Find similar" })).toBeVisible();
  page.once("dialog", dialog => dialog.accept("Python AWS"));
  await page.getByRole("button", { name: "Find similar" }).click();
  await expect(page.locator("#sem-results")).toContainText('Matches for “Python AWS”', { timeout: 10_000 });
});

test("recruiter can revoke the current account sessions", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Email").fill("admin@ats.dev");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("link", { name: "Revoke sessions" })).toBeVisible();
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("link", { name: "Revoke sessions" }).click();
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 10_000 });
});
