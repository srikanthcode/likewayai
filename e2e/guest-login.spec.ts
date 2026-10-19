import { test, expect } from "@playwright/test";

test.describe("Guest Mode / Continue without signing up Flow", () => {
  test("clicking Continue without signing up from /login enters chat and does not redirect to /login", async ({ page, context }) => {
    await context.clearCookies();

    // 1. Visit /login
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);

    // 2. Locate and click "Continue without signing up"
    const guestBtn = page.getByRole("button", { name: /continue without signing up/i });
    await expect(guestBtn).toBeVisible();
    await guestBtn.click();

    // 3. Should navigate to "/" (chat page)
    await page.waitForURL("http://localhost:3000/", { timeout: 15_000 });
    expect(page.url()).toBe("http://localhost:3000/");

    // 4. Verify chat interface is loaded and NOT redirected back to /login
    await page.waitForTimeout(3000);
    expect(page.url()).toBe("http://localhost:3000/");

    // 5. Verify input textarea is available
    const textarea = page.locator("textarea");
    await expect(textarea).toBeVisible({ timeout: 10_000 });

    // 6. Verify cookies were set
    const cookies = await context.cookies();
    const guestCookie = cookies.find(c => c.name === "lw_guest" || c.name === "likeway_guest_mode");
    expect(guestCookie?.value).toBe("true");

    // Take verified screenshot
    await page.screenshot({ path: "scratch/guest_login_verified.png" });
  });

  test("clicking Continue without signing up from /signup enters chat and does not redirect to /login", async ({ page, context }) => {
    await context.clearCookies();

    // 1. Visit /signup
    await page.goto("/signup");
    await expect(page).toHaveURL(/\/signup/);

    // 2. Click "Continue without signing up"
    const guestBtn = page.getByRole("button", { name: /continue without signing up/i });
    await expect(guestBtn).toBeVisible();
    await guestBtn.click();

    // 3. Should navigate to "/" (chat page)
    await page.waitForURL("http://localhost:3000/", { timeout: 15_000 });
    expect(page.url()).toBe("http://localhost:3000/");

    // 4. Confirm stable on root chat
    await page.waitForTimeout(3000);
    expect(page.url()).toBe("http://localhost:3000/");

    const textarea = page.locator("textarea");
    await expect(textarea).toBeVisible({ timeout: 10_000 });
  });

  test("guest user can send a message and receive an AI response in chat interface", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/login");

    const guestBtn = page.getByRole("button", { name: /continue without signing up/i });
    await guestBtn.click();

    await page.waitForURL("http://localhost:3000/", { timeout: 15_000 });
    const textarea = page.locator("textarea");
    await expect(textarea).toBeVisible({ timeout: 10_000 });

    // Type a query
    await textarea.fill("What is 2 + 2?");
    await textarea.press("Enter");

    // Expect the user message to be in the chat container
    await expect(page.locator("text=What is 2 + 2?").first()).toBeVisible({ timeout: 10_000 });

    // Wait for the AI thinking or reply
    await page.waitForTimeout(6000);

    // Save screenshot of live active chat in guest mode
    await page.screenshot({ path: "scratch/guest_chat_verified.png" });
  });
});
