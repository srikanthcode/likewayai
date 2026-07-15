import { test, expect } from "@playwright/test";

test.describe("Checkout Flow", () => {
  test("clicking Upgrade to Plus without auth redirects to login", async ({ page }) => {
    await page.goto("/pricing");
    await page.waitForTimeout(1500);

    const button = page.getByRole("button", { name: "Upgrade to Plus" });
    await button.click();

    await expect(page).toHaveURL(/login/);
  });

  test("clicking Upgrade to Go without auth redirects to login", async ({ page }) => {
    await page.goto("/pricing");
    await page.waitForTimeout(1500);

    const button = page.getByRole("button", { name: "Upgrade to Go" });
    await button.click();

    await expect(page).toHaveURL(/login/);
  });

  test("clicking Upgrade to Pro without auth redirects to login", async ({ page }) => {
    await page.goto("/pricing");
    await page.waitForTimeout(1500);

    const button = page.getByRole("button", { name: "Upgrade to Pro" });
    await button.click();

    await expect(page).toHaveURL(/login/);
  });
});
