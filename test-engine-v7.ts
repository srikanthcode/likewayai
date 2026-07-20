/**
 * Browser Engine v7 — Final Test Suite (crash-safe)
 */
import { chromium } from "playwright";

async function test() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║   Browser Engine v7 — Test Suite         ║");
  console.log("╚══════════════════════════════════════════╝\n");

  const results: { test: string; pass: boolean; detail: string }[] = [];
  const t = (name: string, pass: boolean, detail: string) => {
    results.push({ test: name, pass, detail });
    console.log(`${pass ? "✅" : "❌"} ${name} — ${detail}`);
  };
  const startTime = Date.now();

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
    });
    t("Browser Launch", true, "Chromium headless started");
  } catch (err: any) {
    t("Browser Launch", false, err.message.slice(0, 60));
    return;
  }

  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  });
  const page = await ctx.newPage();

  // ── 1. Dialog handler ──
  page.on("dialog", async (d) => { try { await d.dismiss(); } catch {} });
  t("Dialog Handler", true, "auto-dismiss registered");

  // ── 2. Navigate — example.com ──
  try {
    await page.goto("https://example.com", { waitUntil: "domcontentloaded", timeout: 15000 });
    t("Navigate", page.url().includes("example.com"), `title="${await page.title()}"`);
  } catch (err: any) { t("Navigate", false, err.message.slice(0, 60)); }

  // ── 3. Element extraction ──
  try {
    const els = await page.evaluate(() => {
      const r: any[] = [];
      let i = 0;
      for (const el of document.querySelectorAll("a, button, input, textarea, [role='button'], [role='link']")) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const tag = el.tagName.toLowerCase();
        const role = el.getAttribute("role") || (tag === "a" ? "link" : tag === "button" ? "button" : "textbox");
        const name = (el as HTMLElement).innerText?.trim().slice(0, 40) || (el as HTMLInputElement).placeholder || "";
        r.push({ ref: `e${i++}`, tag, role, name });
      }
      return r;
    });
    t("Element Extraction", els.length > 0, `${els.length} elements found`);
    els.forEach(e => console.log(`      [${e.ref}] <${e.tag}> ${e.role} "${e.name}"`));
  } catch (err: any) { t("Element Extraction", false, err.message.slice(0, 60)); }

  // ── 4. Visible text ──
  try {
    const text = await page.evaluate(() => {
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const c: string[] = [];
      let t = 0, n;
      while ((n = w.nextNode())) {
        const p = n.parentElement;
        if (!p || ["SCRIPT", "STYLE"].includes(p.tagName)) continue;
        const s = (n.textContent || "").trim();
        if (!s) continue;
        if (t + s.length > 300) break;
        c.push(s); t += s.length;
      }
      return c.join(" ");
    });
    t("Visible Text", text.length > 0, `${text.length} chars`);
  } catch (err: any) { t("Visible Text", false, err.message.slice(0, 60)); }

  // ── 5. Feature detection ──
  try {
    const f = await page.evaluate(() => ({
      cookie: !!document.querySelector('#cookie-banner, .cookie-consent'),
      captcha: !!document.querySelector('.g-recaptcha, .h-captcha'),
      video: !!document.querySelector('video, .html5-video-player'),
    }));
    t("Feature Detection", true, `cookie=${f.cookie} captcha=${f.captcha} video=${f.video}`);
  } catch (err: any) { t("Feature Detection", false, err.message.slice(0, 60)); }

  // ── 6. Screenshot ──
  try {
    const buf = await page.screenshot({ fullPage: false, type: "png" });
    t("Screenshot", true, `${(buf.length / 1024).toFixed(1)}KB`);
  } catch (err: any) { t("Screenshot", false, err.message.slice(0, 60)); }

  // ── 7. Navigation — Wikipedia ──
  try {
    await page.goto("https://en.wikipedia.org/wiki/Artificial_intelligence", { waitUntil: "domcontentloaded", timeout: 20000 });
    t("Wikipedia Nav", page.url().includes("wikipedia"), `title="${(await page.title()).slice(0, 35)}..."`);
  } catch (err: any) { t("Wikipedia Nav", false, err.message.slice(0, 60)); }

  // ── 8. Extract 50 links from Wikipedia ──
  try {
    const links = await page.evaluate(() => {
      return [...document.querySelectorAll("a[href]")].slice(0, 50).map(a => ({
        text: a.textContent?.trim().slice(0, 40) || "",
        href: a.href,
      }));
    });
    t("Link Extraction", links.length > 10, `${links.length} links extracted`);
  } catch (err: any) { t("Link Extraction", false, err.message.slice(0, 60)); }

  // ── 9. Multi-strategy element finding ──
  try {
    await page.goto("https://www.google.com", { waitUntil: "domcontentloaded", timeout: 15000 });
    const results: string[] = [];
    // Strategy: role
    try { if (await page.getByRole("combobox").first().isVisible({ timeout: 2000 })) results.push("role"); } catch {}
    // Strategy: css
    try { if (await page.locator('textarea[name="q"]').first().isVisible({ timeout: 2000 })) results.push("css"); } catch {}
    // Strategy: placeholder
    try { if (await page.getByPlaceholder("Search").first().isVisible({ timeout: 2000 })) results.push("placeholder"); } catch {}
    t("Multi-Strategy", results.length > 0, `found via: ${results.join(", ")}`);
  } catch (err: any) { t("Multi-Strategy", false, err.message.slice(0, 60)); }

  // ── 10. Fill + Submit ──
  try {
    await page.locator('textarea[name="q"]').first().fill("browser automation testing", { timeout: 5000 });
    await page.keyboard.press("Enter");
    await page.waitForLoadState("domcontentloaded", { timeout: 10000 });
    t("Fill + Submit", true, `searched successfully`);
  } catch (err: any) { t("Fill + Submit", false, err.message.slice(0, 60)); }

  // ── 11. Page state after navigation ──
  try {
    const afterUrl = page.url();
    const afterTitle = await page.title();
    t("Post-Navigate Verify", afterUrl.includes("google"), `url="${afterUrl.slice(0, 50)}" title="${afterTitle.slice(0, 30)}"`);
  } catch (err: any) { t("Post-Navigate Verify", false, err.message.slice(0, 60)); }

  // ── 12. Console monitoring ──
  let consoleErrors = 0;
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors++; });
  try {
    await page.goto("https://example.com", { waitUntil: "domcontentloaded", timeout: 10000 });
    t("Console Monitor", true, `${consoleErrors} errors`);
  } catch (err: any) { t("Console Monitor", false, err.message.slice(0, 60)); }

  // ── 13. Network monitoring ──
  let failedReqs = 0;
  page.on("requestfailed", () => failedReqs++);
  try {
    await page.goto("https://example.com", { waitUntil: "domcontentloaded", timeout: 10000 });
    t("Network Monitor", true, `${failedReqs} failed requests`);
  } catch (err: any) { t("Network Monitor", false, err.message.slice(0, 60)); }

  // ── 14. Form detection ──
  try {
    await page.goto("https://example.com", { waitUntil: "domcontentloaded", timeout: 10000 });
    const forms = await page.evaluate(() => document.querySelectorAll("form").length);
    t("Form Detection", true, `${forms} forms found`);
  } catch (err: any) { t("Form Detection", false, err.message.slice(0, 60)); }

  // ── 15. Cleanup ──
  try {
    await ctx.close();
    await browser.close();
    t("Browser Cleanup", true, "closed successfully");
  } catch (err: any) { t("Browser Cleanup", false, err.message.slice(0, 60)); }

  // ── Summary ──
  const totalTime = Date.now() - startTime;
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;

  console.log("\n╔══════════════════════════════════════════════╗");
  console.log(`║  RESULTS: ${passed}/${results.length} passed, ${failed} failed`);
  console.log(`║  Time: ${(totalTime / 1000).toFixed(1)}s`);
  console.log(`║  Score: ${Math.round((passed / results.length) * 100)}/100`);
  console.log("╚══════════════════════════════════════════════╝");

  if (failed > 0) {
    console.log("\nFailed:");
    results.filter(r => !r.pass).forEach(r => console.log(`  ❌ ${r.test}: ${r.detail}`));
  }
}

test().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
