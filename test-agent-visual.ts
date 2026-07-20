/**
 * Visual verification — saves screenshots at each step
 * Run: npx tsx test-agent-visual.ts
 */

import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const OPENROUTER_KEY = "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";
const SCREENSHOT_DIR = path.join(process.cwd(), "agent-screenshots");

async function extractDOM(page: any, max = 20) {
  return page.evaluate((mx: number) => {
    const sels = ["input", "textarea", "button", "a[href]", "select", "h1", "h2", "h3", "[role='button']", "[role='searchbox']"];
    const seen = new Set<Element>();
    const out: any[] = [];
    for (const s of sels) {
      for (const el of document.querySelectorAll(s)) {
        if (seen.has(el)) continue;
        seen.add(el);
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0 || window.getComputedStyle(el).display === "none") continue;
        const tag = el.tagName.toLowerCase();
        const id = el.id;
        const name = (el as any).name;
        const placeholder = (el as any).placeholder;
        const aria = el.getAttribute("aria-label");
        let css = tag;
        if (id) css = `#${id}`;
        else if ((tag === "input" || tag === "textarea") && name) css = `${tag}[name="${name}"]`;
        else if (placeholder) css = `${tag}[placeholder="${placeholder}"]`;
        else if (aria) css = `${tag}[aria-label="${aria}"]`;
        out.push({
          i: out.length, tag, css,
          text: ((el as HTMLElement).innerText || "").trim().slice(0, 60) || undefined,
        });
        if (out.length >= mx) return out;
      }
    }
    return out;
  }, max);
}

async function getPageText(page: any, max = 800): Promise<string> {
  return page.evaluate((m: number) => {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const c: string[] = [];
    let t = 0, n;
    while ((n = w.nextNode())) {
      const p = n.parentElement;
      if (!p || p.tagName === "SCRIPT" || p.tagName === "STYLE") continue;
      const s = (n.textContent || "").trim();
      if (!s) continue;
      if (t + s.length > m) break;
      c.push(s); t += s.length;
    }
    return c.join(" ");
  }, max);
}

async function askLLM(task: string, dom: any[], url: string, title: string, text: string) {
  const domStr = dom.map(e =>
    `[${e.i}] <${e.tag}> css="${e.css}"${e.text ? ` "${e.text}"` : ""}`
  ).join("\n");

  const sys = `You are a browser automation agent. Given a task and the current page state, plan ONE action.

Return ONLY a JSON object:
{"action":"<action>","reasoning":"<why>","css":"<selector>","value":"<text>","answer":"<final>"}

Actions: click, type, press, navigate, scroll, go_back, done
- click: {"action":"click","css":"<selector>","reasoning":"..."}
- type: {"action":"type","css":"<selector>","value":"<text to type>","reasoning":"..."}
- press: {"action":"press","value":"<key>","reasoning":"..."}
- done: {"action":"done","answer":"<final answer>","reasoning":"..."}

CRITICAL:
- "type" MUST include "value"
- "click" MUST include "css"
- Use css from the element list EXACTLY
- ONE action only
- Return ONLY valid JSON`;

  const user = `Task: ${task}\nURL: ${url}\nTitle: ${title}\nText: ${text}\n\nElements:\n${domStr || "(empty)"}\n\nNext action?`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENROUTER_KEY}` },
    body: JSON.stringify({
      model: "meta-llama/llama-3.3-70b-instruct",
      messages: [{ role: "system", content: sys }, { role: "user", content: user }],
      temperature: 0.1,
      max_tokens: 250,
    }),
  });

  const data = await res.json();
  if (data.error) {
    console.log(`   ❌ API: ${data.error.message?.slice(0, 80)}`);
    return null;
  }
  const content = data.choices?.[0]?.message?.content || "";
  const m = content.match(/\{[\s\S]*\}/);
  return m ? JSON.parse(m[0]) : null;
}

async function main() {
  // Clean screenshot dir
  if (fs.existsSync(SCREENSHOT_DIR)) fs.rmSync(SCREENSHOT_DIR, { recursive: true });
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const task = "Go to wikipedia.org, search for 'Artificial Intelligence', and tell me the first paragraph";
  console.log(`\n🤖 AI Browser Agent — Visual Verification\nTask: ${task}\n${"─".repeat(60)}`);

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  // STEP 0: Initial screenshot
  console.log("\n🌐 Opening Wikipedia...");
  await page.goto("https://en.wikipedia.org", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const buf0 = await page.screenshot({ fullPage: false });
  fs.writeFileSync(path.join(SCREENSHOT_DIR, "step-0-wikipedia-home.png"), buf0);
  console.log("   📸 Saved: step-0-wikipedia-home.png");

  for (let i = 0; i < 10; i++) {
    const url = page.url();
    const title = await page.title();
    const dom = await extractDOM(page);
    const text = await getPageText(page);

    console.log(`\n── Iteration ${i + 1} ──`);
    console.log(`   URL: ${url}`);
    console.log(`   Elements: ${dom.length}`);

    const action = await askLLM(task, dom, url, title, text);
    if (!action) { console.log("   ⚠️  No response"); continue; }

    console.log(`   ▶ ${action.action}: ${action.reasoning?.slice(0, 80)}`);

    if (action.action === "done") {
      console.log(`\n${"═".repeat(60)}`);
      console.log(`✅ ANSWER:\n${action.answer}`);
      console.log(`${"═".repeat(60)}`);
      break;
    }

    try {
      if (action.action === "click" && action.css) {
        await page.evaluate((css: string) => {
          const el = document.querySelector(css);
          if (el) (el as HTMLElement).click();
        }, action.css);
        await page.waitForTimeout(1000);
      } else if (action.action === "type" && action.css) {
        await page.evaluate((css: string) => {
          const el = document.querySelector(css) as HTMLInputElement;
          if (el) { el.focus(); el.value = ""; }
        }, action.css);
        await page.keyboard.type(action.value || "", { delay: 30 });
        // Screenshot BEFORE pressing Enter
        const bufPre = await page.screenshot({ fullPage: false });
        fs.writeFileSync(path.join(SCREENSHOT_DIR, `step-${i + 1}-typed.png`), bufPre);
        console.log(`   📸 Saved: step-${i + 1}-typed.png`);
        await page.keyboard.press("Enter");
        await page.waitForTimeout(2000);
      } else if (action.action === "press") {
        await page.keyboard.press(action.value || "Enter");
        await page.waitForTimeout(1000);
      } else if (action.action === "navigate" && action.value) {
        await page.goto(action.value, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(1500);
      } else if (action.action === "scroll") {
        await page.evaluate((d: string) => window.scrollBy(0, d === "up" ? -400 : 400), action.direction || "down");
        await page.waitForTimeout(500);
      }

      // Screenshot AFTER action
      const bufAfter = await page.screenshot({ fullPage: false });
      fs.writeFileSync(path.join(SCREENSHOT_DIR, `step-${i + 1}-result.png`), bufAfter);
      console.log(`   📸 Saved: step-${i + 1}-result.png`);
    } catch (e: any) {
      console.log(`   ❌ ${e.message.slice(0, 80)}`);
    }
  }

  await browser.close();
  console.log(`\n📁 All screenshots saved to: ${SCREENSHOT_DIR}/`);
  console.log("🏁 Done.");
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
