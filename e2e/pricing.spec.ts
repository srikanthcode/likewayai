import { test, expect } from "@playwright/test";

test.describe("Pricing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/pricing");
    await page.waitForTimeout(1500);
  });

  test("loads and displays all 4 plans", async ({ page }) => {
    await expect(page.getByText("Elevate your")).toBeVisible();

    for (const name of ["Core", "Go", "Plus", "Pro"]) {
      await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
    }

    await expect(page.getByText("Free")).toBeVisible();
    await expect(page.getByText("₹299")).toBeVisible();
    await expect(page.getByText("₹799")).toBeVisible();
    await expect(page.getByText("₹1,999")).toBeVisible();
  });

  test("Plus plan has MOST POPULAR badge", async ({ page }) => {
    await expect(page.getByText("MOST POPULAR")).toBeVisible();
  });

  test("Go plan has LIMITED TIME OFFER badge", async ({ page }) => {
    await expect(page.getByText("LIMITED TIME OFFER")).toBeVisible();
  });

  test("Pro plan has BEST VALUE badge", async ({ page }) => {
    await expect(page.getByText("BEST VALUE")).toBeVisible();
  });

  test("Plus plan card has gradient CTA button", async ({ page }) => {
    const plusButton = page.getByRole("button", { name: "Upgrade to Plus" });
    await expect(plusButton).toBeVisible();
  });

  test("feature highlights section is visible", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Architect Coding Agent" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Vision & Image Understanding" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Deep Research Engine" })).toBeVisible();
  });

  test("additional features grid shows all 8 items", async ({ page }) => {
    const features = [
      "Multiple AI Models",
      "Image Generation",
      "Voice Assistant",
      "Web Browsing",
      "Extended Memory",
      "Elite Reasoning",
      "Secure by Design",
      "Edge Models",
    ];
    for (const f of features) {
      await expect(page.getByRole("heading", { name: f })).toBeVisible();
    }
  });

  test("GST notice and footer visible", async ({ page }) => {
    await expect(page.getByText("Prices include GST")).toBeVisible();
    await expect(page.getByText("Cancel anytime")).toBeVisible();
  });
});
