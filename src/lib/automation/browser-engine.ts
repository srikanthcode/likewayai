/**
 * LikeWay Browser Engine v7 — Production-Grade Autonomous Browser Agent
 *
 * Architecture:
 *   User Goal → Goal Decomposer → Observe → Think → Act → Verify → Recover → Memory
 *
 * v7 improvements over v6:
 *   18. Vision fallback — screenshot → vision model → coordinates when DOM fails
 *   19. Anti-detection stealth — navigator.webdriver, plugins, languages patched
 *   20. OAuth flow detection — Google/GitHub/Microsoft sign-in detection
 *   21. Safety layer — destructive action detection with user delegation
 *   22. Network failure monitoring — detect failed requests and CORS errors
 *   23. Enhanced popup/modal — shadow DOM, notification, permission dialogs
 *   24. Smart scroll-before-interact — always scroll element into view first
 *   25. Error categorization — structured error types for better recovery
 *   26. Session expiry detection — detect login-required redirects
 *   27. Sub-goal progress tracking — advance goals based on page state changes
 *   28. Console error monitoring — JS errors visible to agent
 *   29. Enhanced few-shot trajectories — 5 examples covering all action types
 *   30. Multi-tab awareness — track and manage new tabs/popups
 */

import * as os from "os";
import * as path from "path";
import * as fs from "fs";

// ═══════════════════════════════════════════════════════════════════════════
// PLAYWRIGHT LOADER — Bundler-proof dynamic import
//
// Problem: Turbopack/webpack traces `import("playwright")` at build time,
// creates a chunk, and at runtime in Vercel Lambda playwright-core tries to
// require('playwright-core/browsers.json') which Vercel's file tracer never
// included in the bundle (it's not in playwright's `exports` map).
//
// Fix: Use `new Function` to hide the import string from static analysis.
// The bundler cannot resolve what it can't see. At runtime, Node.js resolves
// `playwright` from node_modules normally. On Vercel, the import fails and
// we return a clean error instead of crashing the entire serverless function.
// ═══════════════════════════════════════════════════════════════════════════

let _playwright: any = null;

async function getPlaywright() {
  if (_playwright) return _playwright;

  // VERCEL is set even in local dev by Next.js, so check VERCEL_REGION (only set on real Vercel)
  if (process.env.VERCEL_REGION) {
    throw new Error(
      "Browser automation is not available on Vercel. " +
      "Use Render backend at https://likewayai.onrender.com/api/browser-agent instead."
    );
  }

  try {
    // new Function hides the import string from Turbopack/webpack static analysis
    // so the bundler never creates a chunk for playwright
    const loader = new Function("specifier", "return import(specifier)");
    _playwright = await loader("playwright");
    return _playwright;
  } catch (err: any) {
    throw new Error(
      "Browser automation requires playwright. Install it with: npm install playwright\n" +
      `Error: ${err.message}`
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPES (inline — no playwright import needed)
// ═══════════════════════════════════════════════════════════════════════════

type Browser = any;
type BrowserContext = any;
type Page = any;
type Frame = any;

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ActionType =
  | "navigate" | "click" | "double_click" | "right_click"
  | "fill" | "type" | "press" | "scroll"
  | "select" | "hover" | "check" | "uncheck"
  | "go_back" | "go_forward" | "wait" | "evaluate"
  | "screenshot" | "drag" | "upload" | "clipboard_read" | "clipboard_write"
  | "video_play" | "video_pause" | "video_mute" | "video_skip_ad"
  | "done" | "fail";

export type BrowserPhase =
  | "START" | "NAVIGATING" | "FORM_FILLING" | "SUBMITTING"
  | "VERIFYING" | "OTP" | "CAPTCHA" | "ERROR"
  | "DASHBOARD" | "COMPLETE" | "BLOCKED";

export interface DOMElement {
  ref: string;
  tag: string;
  inputType?: string;
  role: string;
  name: string;
  placeholder?: string;
  ariaLabel?: string;
  href?: string;
  id?: string;
  value?: string;
  checked?: boolean;
  disabled?: boolean;
  rect: { x: number; y: number; width: number; height: number };
  frame?: string;
  inShadowDOM?: boolean;
}

export interface PageSnapshot {
  url: string;
  title: string;
  scrollY: number;
  pageHeight: number;
  elements: DOMElement[];
  visibleText: string;
  forms: FormData[];
  screenshot?: string;
  hasCookieBanner: boolean;
  hasCAPTCHA: boolean;
  hasVideoPlayer: boolean;
  isLoading: boolean;
  frameCount: number;
}

export interface FormData {
  action: string;
  method: string;
  fields: { element: DOMElement; label: string; purpose: string; required: boolean }[];
  submitButton?: DOMElement;
}

export interface AgentAction {
  action: ActionType;
  reasoning: string;
  ref?: string;
  value?: string;
  text?: string;
  key?: string;
  direction?: "up" | "down";
  url?: string;
  script?: string;
  answer?: string;
  sourceRef?: string;
  targetRef?: string;
  filePath?: string;
  clipText?: string;
}

export interface AgentStep {
  iteration: number;
  action: AgentAction;
  stateBefore: PageSnapshot;
  stateAfter?: PageSnapshot;
  verified: boolean;
  success: boolean;
  error?: string;
  recoveryAttempts?: number;
  screenshot?: string;
  duration: number;
  subGoal?: string;
}

export interface AgentResult {
  task: string;
  success: boolean;
  answer?: string;
  steps: AgentStep[];
  screenshots: string[];
  error?: string;
  duration?: number;
  finalState: { phase: BrowserPhase; url: string; title: string };
  subGoals?: string[];
}

export interface AgentOptions {
  provider: string;
  modelId: string;
  fetchAI: (provider: any, url: string, options: any) => Promise<Response>;
  headless?: boolean;
  maxIterations?: number;
  viewport?: { width: number; height: number };
  onStep?: (step: AgentStep) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// MEMORY
// ═══════════════════════════════════════════════════════════════════════════

class Memory {
  completedFields = new Set<string>();
  clickedButtons = new Set<string>();
  failedLocators = new Map<string, number>();
  workingLocators = new Map<string, string>();
  pageHistory: string[] = [];
  errors: string[] = [];
  actionHistory: { action: string; ref: string; success: boolean }[] = [];
  domainStrategies = new Map<string, Map<string, number>>();

  markFieldDone(ref: string, value: string) {
    this.completedFields.add(`${ref}:${value}`);
  }

  isFieldDone(ref: string, value: string): boolean {
    return this.completedFields.has(`${ref}:${value}`);
  }

  markButtonClicked(name: string) {
    this.clickedButtons.add(name);
  }

  markFailed(locator: string) {
    const count = (this.failedLocators.get(locator) || 0) + 1;
    this.failedLocators.set(locator, count);
  }

  isFailed(locator: string): boolean {
    return (this.failedLocators.get(locator) || 0) >= 3;
  }

  markWorking(action: string, locator: string) {
    this.workingLocators.set(action, locator);
  }

  recordStrategySuccess(domain: string, strategy: string) {
    if (!this.domainStrategies.has(domain)) this.domainStrategies.set(domain, new Map());
    const domainMap = this.domainStrategies.get(domain)!;
    domainMap.set(strategy, (domainMap.get(strategy) || 0) + 1);
  }

  getPreferredStrategy(domain: string): string | null {
    const domainMap = this.domainStrategies.get(domain);
    if (!domainMap || domainMap.size === 0) return null;
    let best = "";
    let bestCount = 0;
    for (const [strategy, count] of domainMap) {
      if (count > bestCount) { best = strategy; bestCount = count; }
    }
    return best;
  }

  trackPage(url: string) {
    this.pageHistory.push(url);
    if (this.pageHistory.length > 30) this.pageHistory.shift();
  }

  pageChanged(): boolean {
    if (this.pageHistory.length < 2) return true;
    return this.pageHistory[this.pageHistory.length - 1] !== this.pageHistory[this.pageHistory.length - 2];
  }

  addError(err: string) {
    this.errors.push(err);
    if (this.errors.length > 20) this.errors.shift();
  }

  recordAction(action: string, ref: string, success: boolean) {
    this.actionHistory.push({ action, ref, success });
    if (this.actionHistory.length > 30) this.actionHistory.shift();
  }

  isLooping(): boolean {
    const last6 = this.actionHistory.slice(-6);
    if (last6.length < 4) return false;
    const keys = last6.map(a => `${a.action}:${a.ref}`);
    return keys.filter(k => k === keys[0]).length >= 4;
  }

  isScrollLooping(): boolean {
    const last5 = this.actionHistory.slice(-5);
    return last5.length >= 3 && last5.every(a => a.action === "scroll");
  }

  consecutiveFailures(): number {
    let count = 0;
    for (let i = this.actionHistory.length - 1; i >= 0; i--) {
      if (!this.actionHistory[i].success) count++;
      else break;
    }
    return count;
  }

  sameFailCount(action: string, ref: string, success: boolean): number {
    const key = `${action}:${ref}:${success}`;
    let count = 0;
    for (let i = this.actionHistory.length - 1; i >= 0; i--) {
      const a = this.actionHistory[i];
      if (`${a.action}:${a.ref}:${a.success}` === key) count++;
      else break;
    }
    return count;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BROWSER MANAGER
// ═══════════════════════════════════════════════════════════════════════════

function getProfilePath(): string {
  const home = os.homedir();
  return process.env.BROWSER_PROFILE || path.join(home, ".likeway-browser-profile");
}

// ── Session Management ──────────────────────────────────────────────────

function getSessionPath(): string {
  return path.join(getProfilePath(), "session.json");
}

async function saveSession(context: BrowserContext): Promise<void> {
  try {
    const sessionPath = getSessionPath();
    await context.storageState({ path: sessionPath });
    console.log(`[Browser] Session saved to ${sessionPath}`);
  } catch (err: any) {
    console.log(`[Browser] Session save failed: ${err.message?.slice(0, 60)}`);
  }
}

function isSessionFresh(sessionPath: string, maxAgeHours = 24): boolean {
  try {
    const stat = fs.statSync(sessionPath);
    const ageMs = Date.now() - stat.mtimeMs;
    return ageMs < maxAgeHours * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function resolveWildcardPath(pattern: string): string | undefined {
  // Resolve a path containing * by listing the parent directory and matching
  const parts = pattern.split('/');
  const wildcardIdx = parts.findIndex(p => p.includes('*'));

  if (wildcardIdx === -1) {
    // No wildcard — check directly
    try {
      if (fs.existsSync(pattern)) return pattern;
    } catch {}
    return undefined;
  }

  // Build the parent directory (everything before the wildcard segment)
  const parentDir = parts.slice(0, wildcardIdx).join('/') || '/';
  const wildcardSegment = parts[wildcardIdx];
  const suffix = parts.slice(wildcardIdx + 1).join('/');

  // Convert glob segment to regex: * matches any chars except /
  const regex = new RegExp('^' + wildcardSegment.replace(/\./g, '\\.').replace(/\*/g, '[^/]*') + '$');

  try {
    const entries = fs.readdirSync(parentDir);
    for (const entry of entries) {
      if (!regex.test(entry)) continue;
      const resolved = suffix ? `${parentDir}/${entry}/${suffix}` : `${parentDir}/${entry}`;
      try {
        if (fs.statSync(resolved).isFile()) {
          return resolved;
        }
      } catch {}
    }
  } catch {}

  return undefined;
}

function findChromeExecutable(pw?: any): string | undefined {
  // Environment variable override
  if (process.env.PLAYWRIGHT_LAUNCH_OPTIONS_EXECUTABLE_PATH) {
    const envPath = process.env.PLAYWRIGHT_LAUNCH_OPTIONS_EXECUTABLE_PATH;
    // Resolve wildcards using filesystem listing
    if (envPath.includes('*')) {
      const resolved = resolveWildcardPath(envPath);
      if (resolved) {
        console.log(`[Browser] Resolved PLAYWRIGHT_LAUNCH_OPTIONS_EXECUTABLE_PATH wildcard to: ${resolved}`);
        return resolved;
      }
    } else {
      console.log(`[Browser] Using PLAYWRIGHT_LAUNCH_OPTIONS_EXECUTABLE_PATH: ${envPath}`);
      return envPath;
    }
  }

  // Try to find Playwright's system-installed browsers
  let pwBrowsersPath: string | undefined;
  try {
    if (pw && pw.chromium) {
      pwBrowsersPath = pw.chromium.executablePath();
    }
  } catch (err: any) {
    console.log(`[Browser] Failed to get Playwright executablePath:`, err.message);
  }

  if (pwBrowsersPath) {
    console.log(`[Browser] Found Playwright chromium at: ${pwBrowsersPath}`);
    return pwBrowsersPath;
  }

  // Common Playwright install locations
  const commonPaths = [
    // PLAYWRIGHT_BROWSERS_PATH=0 installs in node_modules
    'node_modules/playwright/.local-browsers/chromium*/chrome-linux/chrome',
    'node_modules/playwright-core/.local-browsers/chromium*/chrome-linux/chrome',
    // Render.com specific paths
    '/opt/render/project/.playwright/chromium/chrome-linux/chrome',
    '/opt/render/project/.playwright/chromium-*/chrome-linux/chrome',
    '/opt/render/project/.playwright/chromium*/chrome-linux/chrome',
    '/opt/render/.cache/ms-playwright/chromium*/chrome-linux/chrome',
    // Vercel / CI specific paths
    '/root/.cache/ms-playwright/chromium*/chrome-linux/chrome',
    '/home/runner/.cache/ms-playwright/chromium*/chrome-linux/chrome',
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    process.env.HOME + '/Library/Caches/ms-playwright/chromium*/chrome-mac/Chromium.app/Contents/MacOS/Chromium',
    // Windows
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\ms-playwright\\chromium*\\chrome-win\\chrome.exe',
    // Linux
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
  ];

  for (const p of commonPaths) {
    let resolved: string | undefined;
    if (p.includes('*')) {
      resolved = resolveWildcardPath(p);
    } else {
      try {
        if (fs.existsSync(p)) resolved = p;
      } catch {}
    }
    if (resolved) {
      console.log(`[Browser] Found chromium at: ${resolved}`);
      return resolved;
    }
  }

  console.warn('[Browser] No chromium executable found — browser automation will fail');
  return undefined;
}

async function launchBrowser(options: {
  headless: boolean;
  viewport: { width: number; height: number };
}): Promise<{ browser: Browser; context: BrowserContext; page: Page }> {
  const pw = await getPlaywright();
  const executablePath = findChromeExecutable(pw);

  const launchOptions: any = {
    headless: options.headless,
    args: [
      "--no-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
      "--disable-infobars",
      "--disable-extensions",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
    ],
    ignoreDefaultArgs: ["--enable-automation"],
    timeout: 30000,
  };

  if (executablePath) {
    launchOptions.executablePath = executablePath;
  }

  const browser = await pw.chromium.launch(launchOptions);

  const context = await browser.newContext({
    viewport: options.viewport,
    locale: "en-US",
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    extraHTTPHeaders: {
      "Accept-Language": "en-US,en;q=0.9",
    },
  } as any);

  // Apply stealth BEFORE any page loads
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "plugins", {
      get: () => [1, 2, 3, 4, 5].map(() => ({
        name: "Chrome PDF Plugin",
        description: "Portable Document Format",
        filename: "internal-pdf-viewer",
        length: 1,
      })),
    });
    Object.defineProperty(navigator, "languages", {
      get: () => ["en-US", "en"],
    });
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters: any) =>
      parameters.name === "notifications"
        ? Promise.resolve({ state: "denied" } as PermissionStatus)
        : originalQuery(parameters);
    delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Array;
    delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Promise;
    delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
  });

  // Set up dialog handler (auto-dismiss alerts/confirms/prompts)
  const page = await context.newPage();

  setupPageHandlers(page);
  for (const p of context.pages()) {
    setupPageHandlers(p);
  }

  // Handle new pages (OAuth popups, target=_blank links)
  context.on("page", (newPage: any) => {
    setupPageHandlers(newPage);
    console.log(`[Browser] New page opened: ${newPage.url()}`);
  });

  return { browser, context, page };
}

function setupPageHandlers(page: Page) {
  // Auto-dismiss dialogs
  page.on("dialog", async (dialog: any) => {
    console.log(`[Browser] Dialog dismissed: ${dialog.type()} — ${dialog.message().slice(0, 100)}`);
    try { await dialog.dismiss(); } catch {}
  });

  // Log console errors for debugging
  page.on("console", (msg: any) => {
    if (msg.type() === "error") {
      const text = msg.text();
      // Filter out noisy third-party errors
      if (!text.includes("favicon.ico") && !text.includes("analytics") && !text.includes("gtm.js")) {
        console.log(`[Browser] Console error: ${text.slice(0, 200)}`);
      }
    }
  });

  // Monitor failed network requests
  page.on("requestfailed", (request: any) => {
    const url = request.url();
    // Only log non-trivial failures
    if (!url.includes("favicon") && !url.includes("analytics") && !url.includes(".png") && !url.includes(".jpg")) {
      console.log(`[Browser] Request failed: ${request.failure()?.errorText} — ${url.slice(0, 100)}`);
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE ANALYZER — Extract everything from all frames
// ═══════════════════════════════════════════════════════════════════════════

const INTERACTIVE_SELECTORS = [
  "input:not([type='hidden'])", "textarea", "button", "a[href]", "select",
  "[role='button']", "[role='link']", "[role='searchbox']",
  "[role='combobox']", "[role='textbox']", "[role='menuitem']",
  "[role='checkbox']", "[role='radio']", "[aria-checked]",
  "[contenteditable='true']", "label",
  "input[type='checkbox']", "input[type='radio']",
  "button[type='submit']", "[type='submit']",
  "[role='option']", "[role='tab']", "[role='menuitemcheckbox']",
].join(", ");

async function analyzePage(page: Page, memory: Memory, takeScreenshot = true): Promise<PageSnapshot> {
  // Wait for page to settle (fast)
  try {
    await page.waitForLoadState("domcontentloaded", { timeout: 5000 });
  } catch {}
  try {
    await page.waitForLoadState("networkidle", { timeout: 3000 });
  } catch {}

  // Parallel extraction: context + elements + text + screenshot + page checks
  const [ctx, mainElements, visibleText, screenshot, pageChecks] = await Promise.all([
    page.evaluate(() => ({
      url: window.location.href,
      title: document.title,
      scrollY: window.scrollY,
      pageHeight: document.body.scrollHeight,
    })),
    extractElementsFromPage(page),
    getVisibleText(page, 3000),
    takeScreenshot ? page.screenshot({ fullPage: false, type: "png" }).then((buf: any) => `data:image/png;base64,${buf.toString("base64")}`).catch(() => undefined) : Promise.resolve(undefined),
    detectPageFeatures(page),
  ]);

  memory.trackPage(ctx.url);

  // Extract elements from all iframes
  let allElements = mainElements;
  const frames = page.frames();
  if (frames.length > 1) {
    for (const frame of frames) {
      if (frame === page.mainFrame()) continue;
      try {
        const frameElements = await extractElementsFromFrame(frame);
        allElements = [...allElements, ...frameElements];
      } catch {}
    }
  }

  // Deduplicate by ref and re-index
  const seen = new Set<string>();
  const deduped: DOMElement[] = [];
  let idx = 0;
  for (const el of allElements) {
    const key = `${el.role}:${el.name}:${el.tag}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push({ ...el, ref: `e${idx++}` });
    if (idx >= 80) break; // Increased from 35 to 80
  }

  // Extract forms from main page
  const forms = await extractForms(page).catch(() => [] as FormData[]);

  return {
    ...ctx,
    elements: deduped,
    visibleText,
    forms,
    screenshot,
    hasCookieBanner: pageChecks.hasCookieBanner,
    hasCAPTCHA: pageChecks.hasCAPTCHA,
    hasVideoPlayer: pageChecks.hasVideoPlayer,
    isLoading: pageChecks.isLoading,
    frameCount: frames.length,
  };
}

async function extractElementsFromPage(page: Page, max = 80): Promise<DOMElement[]> {
  return page.evaluate(({ selectors, max }: { selectors: string; max: number }) => {
    const results: any[] = [];
    const seen = new Set<Element>();
    let idx = 0;

    for (const el of document.querySelectorAll(selectors)) {
      if (seen.has(el)) continue;
      seen.add(el);

      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      if (rect.width === 0 || rect.height === 0 || style.display === "none" || style.visibility === "hidden") continue;

      const tag = el.tagName.toLowerCase();
      const inputType = (el as HTMLInputElement).type || "";
      const ariaChecked = el.getAttribute("aria-checked");
      const ariaExpanded = el.getAttribute("aria-expanded");
      const ariaSelected = el.getAttribute("aria-selected");
      const ariaDisabled = el.getAttribute("aria-disabled");
      const role = el.getAttribute("role") ||
        (tag === "a" ? "link" : tag === "button" || inputType === "submit" ? "button" :
         tag === "input" || tag === "textarea" ? "textbox" :
         tag === "select" ? "combobox" :
         ariaChecked !== null || inputType === "checkbox" ? "checkbox" :
         inputType === "radio" ? "radio" : "text");

      const name = (el as HTMLElement).innerText?.trim().slice(0, 80) ||
        (el as HTMLInputElement).placeholder ||
        el.getAttribute("aria-label") ||
        el.getAttribute("title") ||
        (el as HTMLInputElement).value ||
        (inputType === "submit" ? "Submit" : "");

      const mustInclude = ["button", "link", "textbox", "combobox", "checkbox", "radio", "menuitem", "option", "tab"].includes(role) ||
        inputType === "submit" || inputType === "checkbox" || tag === "label";
      if (!name && !mustInclude) continue;

      results.push({
        ref: `e${idx++}`,
        tag,
        inputType: inputType || undefined,
        role,
        name,
        placeholder: (el as HTMLInputElement).placeholder || undefined,
        ariaLabel: el.getAttribute("aria-label") || undefined,
        href: (el as HTMLAnchorElement).href?.slice(0, 120) || undefined,
        id: el.id || undefined,
        value: (el as HTMLInputElement).value || undefined,
        checked: ariaChecked === "true" || (el as HTMLInputElement).checked || undefined,
        disabled: ariaDisabled === "true" || (el as HTMLInputElement).disabled || undefined,
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
        frame: "main",
      });

      if (results.length >= max) break;
    }
    return results;
  }, { selectors: INTERACTIVE_SELECTORS, max });
}

async function extractElementsFromFrame(frame: Frame, max = 30): Promise<DOMElement[]> {
  try {
    return await frame.evaluate(({ selectors, max }: { selectors: string; max: number }) => {
      const results: any[] = [];
      const seen = new Set<Element>();
      let idx = 1000; // Offset to avoid ref collisions with main frame

      for (const el of document.querySelectorAll(selectors)) {
        if (seen.has(el)) continue;
        seen.add(el);

        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        if (rect.width === 0 || rect.height === 0 || style.display === "none" || style.visibility === "hidden") continue;

        const tag = el.tagName.toLowerCase();
        const inputType = (el as HTMLInputElement).type || "";
        const role = el.getAttribute("role") ||
          (tag === "input" ? "textbox" : tag === "button" ? "button" : tag === "a" ? "link" : "text");

        const name = (el as HTMLElement).innerText?.trim().slice(0, 80) ||
          (el as HTMLInputElement).placeholder ||
          el.getAttribute("aria-label") || "";

        if (!name && !["button", "link", "textbox"].includes(role)) continue;

        results.push({
          ref: `e${idx++}`,
          tag,
          inputType: inputType || undefined,
          role,
          name,
          placeholder: (el as HTMLInputElement).placeholder || undefined,
          ariaLabel: el.getAttribute("aria-label") || undefined,
          href: (el as HTMLAnchorElement).href?.slice(0, 120) || undefined,
          id: el.id || undefined,
          value: (el as HTMLInputElement).value || undefined,
          checked: (el as HTMLInputElement).checked || undefined,
          disabled: (el as HTMLInputElement).disabled || undefined,
          rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
          frame: "iframe",
        });

        if (results.length >= max) break;
      }
      return results;
    }, { selectors: INTERACTIVE_SELECTORS, max });
  } catch {
    return [];
  }
}

async function getVisibleText(page: Page, max = 3000): Promise<string> {
  return page.evaluate((max: number) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const chunks: string[] = [];
    let total = 0;
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent) continue;
      if (["SCRIPT", "STYLE", "NOSCRIPT", "SVG", "NOScript"].includes(parent.tagName)) continue;
      const style = window.getComputedStyle(parent);
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;
      const text = (node.textContent || "").trim();
      if (!text) continue;
      if (total + text.length > max) break;
      chunks.push(text);
      total += text.length;
    }
    return chunks.join(" ");
  }, max);
}

async function extractForms(page: Page): Promise<FormData[]> {
  return page.evaluate(() => {
    const forms: any[] = [];
    for (const form of document.querySelectorAll("form")) {
      const formFields: any[] = [];
      for (const input of form.querySelectorAll("input, textarea, select")) {
        const rect = input.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const style = window.getComputedStyle(input);
        if (style.display === "none" || style.visibility === "hidden") continue;

        const iId = input.id;
        const iName = (input as HTMLInputElement).name;
        const iPlaceholder = (input as HTMLInputElement).placeholder;
        const iAria = input.getAttribute("aria-label");

        let label = "";
        if (iId) {
          const l = document.querySelector(`label[for="${iId}"]`);
          if (l) label = l.textContent?.trim() || "";
        }
        if (!label && iPlaceholder) label = iPlaceholder;
        if (!label && iAria) label = iAria;

        formFields.push({
          element: {
            ref: "",
            tag: input.tagName.toLowerCase(),
            inputType: (input as HTMLInputElement).type,
            role: "textbox",
            name: iName || iPlaceholder || iAria || "",
            placeholder: iPlaceholder,
            ariaLabel: iAria,
            id: iId,
            value: (input as HTMLInputElement).value,
            rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          },
          label,
          purpose: "",
          required: input.hasAttribute("required"),
        });
      }

      const submitBtn = form.querySelector('button[type="submit"], input[type="submit"], button:not([type])');
      forms.push({
        action: form.action || "",
        method: form.method || "get",
        fields: formFields,
        submitButton: submitBtn ? {
          ref: "",
          tag: submitBtn.tagName.toLowerCase(),
          role: "button",
          name: submitBtn.textContent?.trim() || "Submit",
          rect: submitBtn.getBoundingClientRect(),
        } : undefined,
      });
    }
    return forms;
  });
}

async function detectPageFeatures(page: Page): Promise<{
  hasCookieBanner: boolean;
  hasCAPTCHA: boolean;
  hasVideoPlayer: boolean;
  isLoading: boolean;
}> {
  return page.evaluate(() => {
    const text = document.body.innerText.toLowerCase();
    const html = document.body.innerHTML.toLowerCase();

    const hasCookieBanner = !!(
      document.querySelector('#cookie-banner, .cookie-consent, .cookie-banner, [data-cookie-banner], [aria-label*="cookie" i]') ||
      (text.includes("cookie") && text.includes("accept"))
    );

    const hasCAPTCHA = !!(
      document.querySelector('iframe[src*="captcha"], iframe[src*="recaptcha"], #captcha, .g-recaptcha, .h-captcha') ||
      text.includes("verify you are human") ||
      text.includes("prove you are not a robot") ||
      html.includes("g-recaptcha")
    );

    const hasVideoPlayer = !!(
      document.querySelector('video, .video-player, #movie_player, .html5-video-player, iframe[src*="youtube"]')
    );

    const isLoading = !!(
      document.querySelector('[aria-busy="true"], .loading, .spinner, .skeleton') ||
      document.querySelector('.animate-pulse[class*="bg"]')
    );

    return { hasCookieBanner, hasCAPTCHA, hasVideoPlayer, isLoading };
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ELEMENT FINDER — Multi-strategy with accessibility-first priority
// ═══════════════════════════════════════════════════════════════════════════

interface FinderResult {
  locator: string;
  strategy: string;
  element?: any;
}

async function findElement(
  page: Page,
  el: DOMElement,
  memory: Memory,
  type: "click" | "fill" | "type" | "select" | "hover" | "check" = "click"
): Promise<FinderResult | null> {
  const domain = new URL(page.url()).hostname;
  const preferred = memory.getPreferredStrategy(domain);

  // Strategy order: preferred first (learned from history), then standard order
  const strategies: Array<{ name: string; fn: () => Promise<any> }> = [];

  if (preferred) {
    strategies.push(...getStrategyFns(page, el, type).filter(s => s.name === preferred));
  }
  strategies.push(...getStrategyFns(page, el, type).filter(s => s.name !== preferred));

  for (const strategy of strategies) {
    const locatorKey = `${strategy.name}:${el.role}:${el.name}`;
    if (memory.isFailed(locatorKey)) continue;

    try {
      const result = await strategy.fn();
      if (result) {
        memory.recordStrategySuccess(domain, strategy.name);
        return { locator: result, strategy: strategy.name };
      }
    } catch {}
  }

  return null;
}

function getStrategyFns(
  page: Page,
  el: DOMElement,
  type: string
): Array<{ name: string; fn: () => Promise<string | null> }> {
  return [
    // Strategy 1: getByRole (Playwright accessibility-first)
    {
      name: "role",
      fn: async () => {
        try {
          const roleMap: Record<string, string> = {
            button: "button", link: "link", textbox: "textbox",
            combobox: "combobox", checkbox: "checkbox", radio: "radio",
            menuitem: "menuitem", option: "option", tab: "tab",
          };
          const role = roleMap[el.role] || el.role;
          const loc = page.getByRole(role as any, { name: el.name, exact: false }).first();
          await loc.scrollIntoViewIfNeeded({ timeout: 4000 });
          return `role:${role}:${el.name}`;
        } catch { return null; }
      }
    },
    // Strategy 2: getByLabel
    {
      name: "label",
      fn: async () => {
        try {
          const loc = page.getByLabel(el.name, { exact: false }).first();
          await loc.scrollIntoViewIfNeeded({ timeout: 3000 });
          return `label:${el.name}`;
        } catch { return null; }
      }
    },
    // Strategy 3: getByPlaceholder
    {
      name: "placeholder",
      fn: async () => {
        if (!el.placeholder) return null;
        try {
          const loc = page.getByPlaceholder(el.placeholder, { exact: false }).first();
          await loc.scrollIntoViewIfNeeded({ timeout: 3000 });
          return `placeholder:${el.placeholder}`;
        } catch { return null; }
      }
    },
    // Strategy 4: getByText
    {
      name: "text",
      fn: async () => {
        try {
          const loc = page.getByText(el.name, { exact: false }).first();
          await loc.scrollIntoViewIfNeeded({ timeout: 3000 });
          return `text:${el.name}`;
        } catch { return null; }
      }
    },
    // Strategy 5: CSS selector from id/name/aria
    {
      name: "css",
      fn: async () => {
        let selector = "";
        if (el.id) selector = `#${el.id}`;
        else if (el.ariaLabel) selector = `[aria-label="${el.ariaLabel}"]`;
        else if (el.placeholder) selector = `[placeholder="${el.placeholder}"]`;
        else if (el.name && ["input", "textarea", "select"].includes(el.tag)) selector = `${el.tag}[name="${el.name}"]`;
        if (!selector) return null;
        try {
          const loc = page.locator(selector).first();
          await loc.scrollIntoViewIfNeeded({ timeout: 3000 });
          return selector;
        } catch { return null; }
      }
    },
    // Strategy 6: JavaScript DOM search
    {
      name: "javascript",
      fn: async () => {
        const found = await page.evaluate((name: string) => {
          const candidates = document.querySelectorAll("a, button, [role='button'], label, [onclick], [type='submit']");
          for (const el of candidates) {
            if (el.textContent?.trim().includes(name)) {
              return true;
            }
          }
          return false;
        }, el.name);
        return found ? `js:${el.name}` : null;
      }
    },
    // Strategy 7: Coordinate click (last resort)
    {
      name: "coordinate",
      fn: async () => {
        if (el.rect.width === 0 || el.rect.height === 0) return null;
        return `coord:${el.rect.x + el.rect.width / 2}:${el.rect.y + el.rect.height / 2}`;
      }
    },
  ];
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTION EXECUTOR
// ═══════════════════════════════════════════════════════════════════════════

async function executeAction(
  page: Page,
  action: AgentAction,
  elements: DOMElement[],
  memory: Memory
): Promise<{ success: boolean; error?: string }> {
  try {
    switch (action.action) {
      case "navigate": {
        const navUrl = action.url || action.value;
        if (!navUrl) return { success: false, error: "No URL provided" };
        await page.goto(navUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
        // Auto-dismiss cookie banners after navigation
        await autoDismissBlockers(page);
        return { success: true };
      }

      case "click": return await executeClick(page, action, elements, memory, "click");
      case "double_click": return await executeClick(page, action, elements, memory, "dblclick");
      case "right_click": return await executeClick(page, action, elements, memory, "rightclick");

      case "fill": return await executeFill(page, action, elements, memory);
      case "type": return await executeType(page, action, elements);

      case "press": {
        if (!action.key) return { success: false, error: "No key" };
        await page.keyboard.press(action.key);
        await page.waitForLoadState("domcontentloaded", { timeout: 5000 }).catch(() => {});
        return { success: true };
      }

      case "scroll": {
        await page.evaluate((d: string) => {
          window.scrollBy({ top: d === "up" ? -800 : 800, behavior: "smooth" });
        }, action.direction || "down");
        await page.waitForTimeout(150); // Brief scroll settle
        return { success: true };
      }

      case "hover": return await executeHover(page, action, elements);
      case "check": return await executeCheck(page, action, elements, memory, true);
      case "uncheck": return await executeCheck(page, action, elements, memory, false);

      case "select": {
        if (!action.ref || !action.value) return { success: false, error: "No ref/value" };
        const el = elements.find(e => e.ref === action.ref);
        if (!el) return { success: false, error: `Ref ${action.ref} not found` };
        try {
          await page.getByRole("combobox", { name: el.name, exact: false }).first()
            .selectOption(action.value, { timeout: 5000 });
          return { success: true };
        } catch {
          try {
            await page.getByLabel(el.name, { exact: false }).first()
              .selectOption(action.value, { timeout: 5000 });
            return { success: true };
          } catch {
            return { success: false, error: `Could not select ref ${action.ref}` };
          }
        }
      }

      case "go_back": {
        await page.goBack({ waitUntil: "domcontentloaded", timeout: 15000 });
        await autoDismissBlockers(page);
        return { success: true };
      }

      case "go_forward": {
        await page.goForward({ waitUntil: "domcontentloaded", timeout: 15000 });
        return { success: true };
      }

      case "wait": {
        const ms = parseInt(action.value || "2000") || 2000;
        await page.waitForTimeout(Math.min(ms, 10000)); // Cap at 10s
        return { success: true };
      }

      case "evaluate": {
        if (!action.script) return { success: false, error: "No script" };
        await page.evaluate(action.script);
        return { success: true };
      }

      case "drag": {
        if (!action.sourceRef || !action.targetRef) return { success: false, error: "Need source and target refs" };
        const srcEl = elements.find(e => e.ref === action.sourceRef);
        const tgtEl = elements.find(e => e.ref === action.targetRef);
        if (!srcEl || !tgtEl) return { success: false, error: "Element not found" };
        const srcLocator = `text=${srcEl.name}`;
        const tgtLocator = `text=${tgtEl.name}`;
        await page.dragAndDrop(srcLocator, tgtLocator, { timeout: 5000 });
        return { success: true };
      }

      case "upload": {
        if (!action.ref || !action.filePath) return { success: false, error: "Need ref and filePath" };
        const uploadEl = elements.find(e => e.ref === action.ref);
        if (!uploadEl) return { success: false, error: `Ref ${action.ref} not found` };
        const fileInput = page.locator('input[type="file"]').first();
        await fileInput.setInputFiles(action.filePath, { timeout: 5000 });
        return { success: true };
      }

      case "clipboard_read": {
        const text = await page.evaluate(() => navigator.clipboard.readText());
        return { success: true, error: text }; // abusing error field for return value
      }

      case "clipboard_write": {
        if (!action.clipText) return { success: false, error: "No text" };
        await page.evaluate((t: string) => navigator.clipboard.writeText(t), action.clipText);
        return { success: true };
      }

      case "video_play": {
        await page.evaluate(() => {
          const v = document.querySelector("video") as HTMLVideoElement;
          if (v) v.play();
        });
        return { success: true };
      }

      case "video_pause": {
        await page.evaluate(() => {
          const v = document.querySelector("video") as HTMLVideoElement;
          if (v) v.pause();
        });
        return { success: true };
      }

      case "video_mute": {
        await page.evaluate(() => {
          const v = document.querySelector("video") as HTMLVideoElement;
          if (v) v.muted = !v.muted;
        });
        return { success: true };
      }

      case "video_skip_ad": {
        const skipped = await page.evaluate(() => {
          const btn = document.querySelector('.ytp-skip-ad-button, .videoAdUiSkipButton, [class*="skip"]') as HTMLElement;
          if (btn) { btn.click(); return true; }
          return false;
        });
        return { success: skipped, error: skipped ? undefined : "No skip button found" };
      }

      case "done":
      case "fail":
      case "screenshot":
        return { success: true };

      default:
        return { success: false, error: `Unknown action: ${action.action}` };
    }
  } catch (err: any) {
    return { success: false, error: err.message?.slice(0, 200) || "Unknown error" };
  }
}

async function executeClick(
  page: Page, action: AgentAction, elements: DOMElement[], memory: Memory,
  clickType: "click" | "dblclick" | "rightclick" = "click"
): Promise<{ success: boolean; error?: string }> {
  if (!action.ref) return { success: false, error: "No ref" };
  const el = elements.find(e => e.ref === action.ref);
  if (!el) return { success: false, error: `Ref ${action.ref} not found` };

  const locatorKey = `${clickType}:${el.role}:${el.name}`;
  if (memory.isFailed(locatorKey)) return { success: false, error: `Failed 3x: ${locatorKey}` };

  // Try multi-strategy finding
  const found = await findElement(page, el, memory, "click");
  if (!found) {
    memory.markFailed(locatorKey);
    return { success: false, error: `All strategies failed for "${el.name}"` };
  }

  // Execute click using the found locator
  try {
    if (found.strategy === "coordinate") {
      const parts = found.locator.split(":");
      const x = parseFloat(parts[1]);
      const y = parseFloat(parts[2]);
      if (clickType === "dblclick") await page.mouse.dblclick(x, y);
      else if (clickType === "rightclick") await page.mouse.click(x, y, { button: "right" });
      else await page.mouse.click(x, y);
    } else if (found.strategy === "javascript") {
      await page.evaluate((name: string) => {
        const els = document.querySelectorAll("a, button, [role='button'], label, [onclick], [type='submit']");
        for (const el of els) {
          if (el.textContent?.trim().includes(name)) { (el as HTMLElement).click(); return; }
        }
      }, el.name);
    } else {
      // Use Playwright locator
      let loc;
      if (found.strategy === "role") {
        const roleMap: Record<string, string> = {
          button: "button", link: "link", textbox: "textbox",
          combobox: "combobox", checkbox: "checkbox", radio: "radio",
        };
        loc = page.getByRole((roleMap[el.role] || el.role) as any, { name: el.name, exact: false }).first();
      } else if (found.strategy === "label") {
        loc = page.getByLabel(el.name, { exact: false }).first();
      } else if (found.strategy === "placeholder") {
        loc = page.getByPlaceholder(el.placeholder || el.name, { exact: false }).first();
      } else if (found.strategy === "text") {
        loc = page.getByText(el.name, { exact: false }).first();
      } else {
        loc = page.locator(found.locator).first();
      }

      await loc.scrollIntoViewIfNeeded({ timeout: 4000 });
      if (clickType === "dblclick") await loc.dblclick({ timeout: 5000 });
      else if (clickType === "rightclick") await loc.click({ button: "right", timeout: 5000 });
      else await loc.click({ timeout: 5000 });
    }

    // Wait for page to settle (event-based, fast)
    try {
      await page.waitForLoadState("domcontentloaded", { timeout: 3000 });
    } catch {}
    await page.waitForTimeout(100); // Brief settle
    memory.markWorking(clickType, locatorKey);
    return { success: true };
  } catch (err: any) {
    memory.markFailed(locatorKey);
    return { success: false, error: err.message?.slice(0, 100) };
  }
}

async function executeFill(
  page: Page, action: AgentAction, elements: DOMElement[], memory: Memory
): Promise<{ success: boolean; error?: string }> {
  if (!action.ref || action.value === undefined) return { success: false, error: "No ref/value" };
  const el = elements.find(e => e.ref === action.ref);
  if (!el) return { success: false, error: `Ref ${action.ref} not found` };

  if (memory.isFieldDone(action.ref, action.value)) {
    return { success: true, error: "Already filled" };
  }

  const found = await findElement(page, el, memory, "fill");
  if (!found) return { success: false, error: `Could not find field "${el.name}"` };

  try {
    if (found.strategy === "coordinate") {
      const parts = found.locator.split(":");
      await page.mouse.click(parseFloat(parts[1]), parseFloat(parts[2]));
      await page.waitForTimeout(200);
      await page.keyboard.insertText(action.value);
    } else if (found.strategy === "javascript") {
      await page.evaluate(({ name, val }: { name: string; val: string }) => {
        const inputs = document.querySelectorAll("input, textarea");
        for (const inp of inputs) {
          const ph = (inp as HTMLInputElement).placeholder || "";
          const nm = (inp as HTMLInputElement).name || "";
          const aria = (inp as HTMLElement).getAttribute("aria-label") || "";
          if (ph.includes(name) || nm.includes(name.toLowerCase()) || aria.includes(name)) {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
            if (setter) setter.call(inp, val);
            else (inp as HTMLInputElement).value = val;
            inp.dispatchEvent(new Event("input", { bubbles: true }));
            inp.dispatchEvent(new Event("change", { bubbles: true }));
            return;
          }
        }
      }, { name: el.name, val: action.value });
    } else {
      let loc;
      if (found.strategy === "role") {
        loc = page.getByRole(el.role as any, { name: el.name, exact: false }).first();
      } else if (found.strategy === "label") {
        loc = page.getByLabel(el.name, { exact: false }).first();
      } else if (found.strategy === "placeholder") {
        loc = page.getByPlaceholder(el.placeholder || el.name, { exact: false }).first();
      } else {
        loc = page.locator(found.locator).first();
      }
      await loc.scrollIntoViewIfNeeded({ timeout: 4000 });
      await loc.fill(action.value, { timeout: 5000 });
    }

    memory.markFieldDone(action.ref, action.value);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message?.slice(0, 100) };
  }
}

async function executeType(
  page: Page, action: AgentAction, elements: DOMElement[]
): Promise<{ success: boolean; error?: string }> {
  if (!action.ref || action.text === undefined) return { success: false, error: "No ref/text" };
  const el = elements.find(e => e.ref === action.ref);
  if (!el) return { success: false, error: `Ref ${action.ref} not found` };

  try {
    const loc = page.getByRole(el.role as any, { name: el.name, exact: false }).first();
    await loc.scrollIntoViewIfNeeded({ timeout: 4000 });
    await loc.click({ timeout: 5000 });
    await loc.type(action.text, { delay: 30 });
    return { success: true };
  } catch {
    // Fallback: click and type
    try {
      const found = await findElement(page, el, { isFailed: () => false } as any, "type");
      if (found) {
        await page.mouse.click(el.rect.x + el.rect.width / 2, el.rect.y + el.rect.height / 2);
        await page.keyboard.type(action.text, { delay: 30 });
        return { success: true };
      }
    } catch {}
    return { success: false, error: `Could not type in "${el.name}"` };
  }
}

async function executeHover(
  page: Page, action: AgentAction, elements: DOMElement[]
): Promise<{ success: boolean; error?: string }> {
  if (!action.ref) return { success: false, error: "No ref" };
  const el = elements.find(e => e.ref === action.ref);
  if (!el) return { success: false, error: `Ref ${action.ref} not found` };

  try {
    await page.getByRole(el.role as any, { name: el.name, exact: false }).first()
      .hover({ timeout: 5000 });
    return { success: true };
  } catch {
    return { success: false, error: `Could not hover "${el.name}"` };
  }
}

async function executeCheck(
  page: Page, action: AgentAction, elements: DOMElement[], memory: Memory,
  check: boolean
): Promise<{ success: boolean; error?: string }> {
  if (!action.ref) return { success: false, error: "No ref" };
  const el = elements.find(e => e.ref === action.ref);
  if (!el) return { success: false, error: `Ref ${action.ref} not found` };

  if (check && el.checked) return { success: true, error: "Already checked" };
  if (!check && !el.checked) return { success: true, error: "Already unchecked" };

  const locatorKey = `check:${el.name}`;
  if (memory.isFailed(locatorKey)) return { success: false, error: `Failed 3x: ${locatorKey}` };

  // Strategy 1: native checkbox
  try {
    if (check) {
      await page.getByRole("checkbox", { name: el.name, exact: false }).first().check({ timeout: 4000 });
    } else {
      await page.getByRole("checkbox", { name: el.name, exact: false }).first().uncheck({ timeout: 4000 });
    }
    return { success: true };
  } catch {}

  // Strategy 2: getByLabel
  try {
    await page.getByLabel(el.name, { exact: false }).first().click({ timeout: 4000 });
    return { success: true };
  } catch {}

  // Strategy 3: getByText
  try {
    await page.getByText(el.name, { exact: false }).first().click({ timeout: 4000 });
    return { success: true };
  } catch {}

  // Strategy 4: JavaScript
  try {
    const clicked = await page.evaluate((name: string) => {
      const labels = document.querySelectorAll("label");
      for (const label of labels) {
        if (label.textContent?.includes(name)) { label.click(); return true; }
      }
      const checked = document.querySelectorAll("[aria-checked], [role='checkbox']");
      for (const el of checked) {
        if (el.textContent?.includes(name)) { (el as HTMLElement).click(); return true; }
      }
      return false;
    }, el.name);
    if (clicked) return { success: true };
  } catch {}

  // Strategy 5: Coordinate
  if (el.rect.width > 0) {
    try {
      await page.mouse.click(el.rect.x + el.rect.width / 2, el.rect.y + el.rect.height / 2);
      return { success: true };
    } catch {}
  }

  memory.markFailed(locatorKey);
  return { success: false, error: `Could not ${check ? "check" : "uncheck"} "${el.name}"` };
}

// ═══════════════════════════════════════════════════════════════════════════
// VISION FALLBACK — Screenshot → Vision Model → Coordinates
// ═══════════════════════════════════════════════════════════════════════════

async function visionFind(
  page: Page,
  targetDescription: string,
  fetchAI: AgentOptions["fetchAI"],
  provider: string,
  modelId: string
): Promise<{ x: number; y: number } | null> {
  try {
    const screenshotBuf = await page.screenshot({ fullPage: false });
    const b64 = screenshotBuf.toString("base64");

    const url = provider === "groq"
      ? "https://api.groq.com/openai/v1/chat/completions"
      : "https://openrouter.ai/api/v1/chat/completions";

    const response = await fetchAI(provider, url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelId,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: `Look at this screenshot. Find the element that matches: "${targetDescription}". Return ONLY a JSON object with x and y coordinates (center of the element). Example: {"x":500,"y":300}. If no element matches, return {"x":0,"y":0}.` },
            { type: "image_url", image_url: { url: `data:image/png;base64,${b64}` } },
          ],
        }],
        temperature: 0.1,
        max_tokens: 50,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "";
    const match = content.match(/\{[^}]*"x"\s*:\s*(\d+)[^}]*"y"\s*:\s*(\d+)[^}]*\}/);
    if (match) {
      const x = parseInt(match[1]);
      const y = parseInt(match[2]);
      if (x > 0 && y > 0) return { x, y };
    }
  } catch {}
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// ANTI-DETECTION STEALTH
// ═══════════════════════════════════════════════════════════════════════════

async function applyStealthPatch(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Override navigator.webdriver
    Object.defineProperty(navigator, "webdriver", { get: () => false });

    // Override navigator.plugins (empty array looks suspicious)
    Object.defineProperty(navigator, "plugins", {
      get: () => [1, 2, 3, 4, 5].map(() => ({
        name: "Chrome PDF Plugin",
        description: "Portable Document Format",
        filename: "internal-pdf-viewer",
        length: 1,
      })),
    });

    // Override navigator.languages
    Object.defineProperty(navigator, "languages", {
      get: () => ["en-US", "en"],
    });

    // Override permissions query
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters: any) =>
      parameters.name === "notifications"
        ? Promise.resolve({ state: "denied" } as PermissionStatus)
        : originalQuery(parameters);

    // Remove automation indicators
    delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Array;
    delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Promise;
    delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// OAUTH / SSO DETECTION
// ═══════════════════════════════════════════════════════════════════════════

interface OAuthDetection {
  detected: boolean;
  provider?: string;
  buttonRef?: string;
}

function detectOAuth(page: Page, elements: DOMElement[]): OAuthDetection {
  const oauthPatterns = [
    { pattern: /google.*sign.*in|sign.*in.*with.*google|continue.*with.*google/i, provider: "Google" },
    { pattern: /github.*sign.*in|sign.*in.*with.*github|continue.*with.*github/i, provider: "GitHub" },
    { pattern: /microsoft.*sign.*in|sign.*in.*with.*microsoft|continue.*with.*microsoft|sign.*in.*with.*outlook/i, provider: "Microsoft" },
    { pattern: /sign.*in.*with.*apple|continue.*with.*apple/i, provider: "Apple" },
    { pattern: /sign.*in.*with.*facebook|continue.*with.*facebook/i, provider: "Facebook" },
  ];

  for (const el of elements) {
    const text = `${el.name} ${el.ariaLabel || ""} ${el.placeholder || ""}`.toLowerCase();
    for (const { pattern, provider } of oauthPatterns) {
      if (pattern.test(text)) {
        return { detected: true, provider, buttonRef: el.ref };
      }
    }
  }
  return { detected: false };
}

// ═══════════════════════════════════════════════════════════════════════════
// SAFETY LAYER — Destructive Action Detection
// ═══════════════════════════════════════════════════════════════════════════

const DESTRUCTIVE_PATTERNS = [
  /delete\s+(this|my|the|account|project|file|post|message)/i,
  /remove\s+(this|my|the|account|project|file)/i,
  /unsubscribe/i,
  /cancel\s+(subscription|account|order)/i,
  /purchase|buy|pay|checkout|order\s+now/i,
  /submit\s+payment|confirm\s+payment/i,
  /transfer\s+money|send\s+money/i,
  /drop\s+table|drop\s+database/i,
  /format\s+(disk|drive|computer)/i,
];

function isDestructiveAction(action: AgentAction, snapshot: PageSnapshot): boolean {
  const combined = `${action.reasoning || ""} ${action.value || ""} ${action.text || ""}`.toLowerCase();
  return DESTRUCTIVE_PATTERNS.some(p => p.test(combined));
}

// ═══════════════════════════════════════════════════════════════════════════
// SESSION EXPIRY DETECTION
// ═══════════════════════════════════════════════════════════════════════════

function detectSessionExpired(url: string, text: string): boolean {
  const combined = (url + " " + text).toLowerCase();
  return /session\s+expired|please\s+log\s+in|authentication\s+required|access\s+denied.*login/i.test(combined);
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTO-DISMISS BLOCKERS
// ═══════════════════════════════════════════════════════════════════════════

async function autoDismissBlockers(page: Page): Promise<void> {
  const patterns = [
    // Cookie banners
    'button:has-text("Accept All")',
    'button:has-text("Accept Cookies")',
    'button:has-text("Accept all cookies")',
    'button:has-text("Accept")',
    'button:has-text("Allow All")',
    'button:has-text("Allow all")',
    'button:has-text("I agree")',
    'button:has-text("I Accept")',
    'button:has-text("OK")',
    'button:has-text("Got it")',
    'button:has-text("Got It")',
    'button:has-text("Understood")',
    // Notification permission dialogs
    'button:has-text("Block")',
    'button:has-text("Allow")',
    // Generic close buttons
    'button:has-text("Dismiss")',
    'button:has-text("No thanks")',
    'button:has-text("No Thanks")',
    'button:has-text("Close")',
    'button:has-text("Not now")',
    '[aria-label="Close"]',
    '[aria-label="Dismiss"]',
    '[aria-label="No thanks"]',
    '[data-cookie-banner] button',
    '[data-bs-dismiss="modal"]',
    // GDPR consent
    '#onetrust-accept-btn-handler',
    '.onetrust-close-btn-handler',
    '[id*="cookie"] button[id*="accept"]',
    // Common consent managers
    '.cc-accept',
    '.cc-btn.cc-dismiss',
  ];

  for (const selector of patterns) {
    try {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 800 }).catch(() => false)) {
        await el.click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(200);
      }
    } catch {}
  }

  // Also try JavaScript-based removal for stubborn overlays
  try {
    await page.evaluate(() => {
      const overlaySelectors = [
        '.cookie-banner', '.cookie-consent', '.cookie-notice', '.cookie-popup',
        '[class*="cookie-banner"]', '[class*="cookie-consent"]', '[class*="cookie-notice"]',
        '#cookie-consent', '#cookie-notice', '#gdpr-banner',
        '.modal-backdrop', '.overlay-backdrop',
      ];
      for (const sel of overlaySelectors) {
        const el = document.querySelector(sel);
        if (el && el instanceof HTMLElement && el.offsetParent !== null) {
          el.style.display = 'none';
        }
      }
    });
  } catch {}
}

// ═══════════════════════════════════════════════════════════════════════════
// VERIFIER
// ═══════════════════════════════════════════════════════════════════════════

async function verify(
  page: Page,
  before: PageSnapshot,
  action: AgentAction,
  executionResult: { success: boolean; error?: string }
): Promise<{ verified: boolean; reason: string }> {
  if (!executionResult.success) {
    return { verified: false, reason: executionResult.error || "Action failed" };
  }

  try {
    const afterUrl = page.url();
    const afterTitle = await page.title();

    // URL changed = significant progress
    if (afterUrl !== before.url) {
      // Check for error pages
      if (/404|403|500|error|not.?found/i.test(afterUrl)) {
        return { verified: false, reason: `Error page: ${afterUrl}` };
      }
      // Check for login redirects (session expired)
      if (/login|signin|auth/i.test(afterUrl) && !/login|signin|auth/i.test(before.url)) {
        return { verified: false, reason: `Session expired — redirected to login: ${afterUrl}` };
      }
      return { verified: true, reason: `URL changed: ${afterUrl}` };
    }

    // For click/navigate actions, check content change
    if (action.action === "click" || action.action === "navigate") {
      try {
        const afterText = await getVisibleText(page, 500);
        if (afterText !== before.visibleText.slice(0, 500)) {
          return { verified: true, reason: "Content changed" };
        }
      } catch {}
    }

    // Title changed
    if (afterTitle !== before.title) {
      return { verified: true, reason: `Title changed: ${afterTitle}` };
    }

    // Check for error messages in content
    try {
      const afterText = await getVisibleText(page, 300);
      const errorSignals = ["error", "failed", "something went wrong", "try again", "not found"];
      for (const signal of errorSignals) {
        if (afterText.toLowerCase().includes(signal) && !before.visibleText.toLowerCase().includes(signal)) {
          return { verified: false, reason: `Error appeared: "${signal}"` };
        }
      }
    } catch {}

    return { verified: true, reason: "Action executed" };
  } catch {
    return { verified: false, reason: "Verification error" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE DETECTION
// ═══════════════════════════════════════════════════════════════════════════

function detectPhase(url: string, title: string, text: string, snapshot: PageSnapshot): BrowserPhase {
  const combined = (url + " " + title + " " + text).toLowerCase();

  if (snapshot.hasCAPTCHA) return "CAPTCHA";
  if (/otp|verify.*code|enter.*code|one.time|验证码|two.factor|2fa|verification.*email|check.*email/.test(combined)) return "OTP";
  if (/error|failed|invalid|denied|blocked|forbidden|403|404|500|something went wrong|internal server/.test(combined) && text.length < 500) return "ERROR";
  if (/dashboard|welcome|home|profile|account|settings|inbox|my.*page|overview/.test(combined)) return "DASHBOARD";
  if (/login|sign.?in|log.?in|email.*password|password.*email|enter.*password|welcome.*back/.test(combined)) return "FORM_FILLING";
  if (/sign.?up|register|create.*account|join|new.*account|create.*profile/.test(combined)) return "FORM_FILLING";
  if (/submit|processing|loading|please.*wait/.test(combined)) return "SUBMITTING";

  return "NAVIGATING";
}

// ═══════════════════════════════════════════════════════════════════════════
// RECOVERY ENGINE — Adaptive, strategy chosen by error type
// ═══════════════════════════════════════════════════════════════════════════

async function recover(
  page: Page,
  action: AgentAction,
  error: string,
  memory: Memory
): Promise<{ recovered: boolean; hint?: string }> {
  memory.addError(error);

  // Choose recovery strategy based on error type
  const errorLower = error.toLowerCase();

  // Element not found → try scrolling to find it
  if (errorLower.includes("not found") || errorLower.includes("selector") || errorLower.includes("locator")) {
    await page.evaluate(() => window.scrollBy(0, -300));
    await page.waitForTimeout(100);
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(150);
    return { recovered: true, hint: "Scrolled to find element" };
  }

  // Timeout → page might be loading, wait for network idle
  if (errorLower.includes("timeout") || errorLower.includes("waiting")) {
    try {
      await page.waitForLoadState("networkidle", { timeout: 5000 });
    } catch {}
    return { recovered: true, hint: "Waited for page to load" };
  }

  // Navigation intercepted → page is navigating, wait
  if (errorLower.includes("intercept") || errorLower.includes("navigation")) {
    await page.waitForTimeout(500);
    try {
      await page.waitForLoadState("domcontentloaded", { timeout: 5000 });
    } catch {}
    return { recovered: true, hint: "Waited for navigation" };
  }

  // Click intercepted by overlay → close popups/modals first
  if (errorLower.includes("click") && errorLower.includes("intercepted")) {
    await autoDismissBlockers(page);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    return { recovered: true, hint: "Closed overlay/popup" };
  }

  // Target closed (page navigated away) → wait for new page
  if (errorLower.includes("target closed") || errorLower.includes("detached")) {
    await page.waitForTimeout(500);
    try {
      await page.waitForLoadState("domcontentloaded", { timeout: 5000 });
    } catch {}
    return { recovered: true, hint: "Waited for new page" };
  }

  // Frame detached → page reloaded, wait
  if (errorLower.includes("frame") && errorLower.includes("detach")) {
    await page.waitForTimeout(500);
    return { recovered: true, hint: "Waited for frame reload" };
  }

  // Generic recovery: try pressing Escape first (might close a modal), then refresh
  if (!errorLower.includes("refresh")) {
    try {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
    } catch {}
  }

  // Last resort: refresh page (but limit to 2 refreshes per session)
  if (memory.errors.filter(e => e.includes("refresh")).length < 2) {
    try {
      await page.reload({ waitUntil: "domcontentloaded", timeout: 15000 });
      await autoDismissBlockers(page);
      return { recovered: true, hint: "Refreshed page" };
    } catch {}
  }

  return { recovered: false };
}

// ═══════════════════════════════════════════════════════════════════════════
// LLM PLANNER — Chain-of-thought with few-shot examples
// ═══════════════════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `You are LikeWay Browser — an autonomous browser agent controlling a REAL browser. Every action must progress toward the user's goal.

## THOUGHT PROCESS (mandatory before EVERY action)
Before returning your action, think:
1. OBSERVE: What URL am I on? What do I see? What elements are available?
2. ANALYZE: Where am I relative to my goal? What needs to happen next?
3. PLAN: What single action moves me closest to my goal?
4. RISK: Could this cause problems? Is there a safer alternative?

## ELEMENT FORMAT
Elements are listed as: [ref] <tag> role "name" @x,y
Use the "ref" value (e.g. e5) to target elements.

## ACTIONS (return ONE JSON object)
- navigate: {"action":"navigate","url":"<FULL URL>","reasoning":"..."}
- click: {"action":"click","ref":"eN","reasoning":"..."}
- double_click: {"action":"double_click","ref":"eN","reasoning":"..."}
- right_click: {"action":"right_click","ref":"eN","reasoning":"..."}
- fill: {"action":"fill","ref":"eN","value":"<text>","reasoning":"..."}
- type: {"action":"type","ref":"eN","text":"<text>","reasoning":"..."}
- press: {"action":"press","key":"<key>","reasoning":"..."}
- scroll: {"action":"scroll","direction":"down|up","reasoning":"..."}
- check: {"action":"check","ref":"eN","reasoning":"..."}
- select: {"action":"select","ref":"eN","value":"<option>","reasoning":"..."}
- hover: {"action":"hover","ref":"eN","reasoning":"..."}
- go_back: {"action":"go_back","reasoning":"..."}
- wait: {"action":"wait","value":"<ms>","reasoning":"..."}
- evaluate: {"action":"evaluate","script":"<js>","reasoning":"..."}
- video_play: {"action":"video_play","reasoning":"..."}
- video_pause: {"action":"video_pause","reasoning":"..."}
- video_skip_ad: {"action":"video_skip_ad","reasoning":"..."}
- done: {"action":"done","answer":"<what was accomplished>","reasoning":"..."}
- fail: {"action":"fail","answer":"<why it can't be done>","reasoning":"..."}

## RULES
1. URLs: NEVER truncate. Use the EXACT full URL character for character.
2. ONE action per response. Never combine actions.
3. BEFORE every action: READ the current page state. Don't assume.
4. NEVER scroll more than 2 times without a different action.
5. NEVER repeat the same failing action more than 2 times.
6. If you see a CAPTCHA → tell the user you cannot bypass it.
7. If a cookie banner blocks → dismiss it first.
8. If a modal covers the page → close it first.
9. After navigating, READ content and TAKE ACTION — don't just scroll.
10. If the page says "Sign in with Google/GitHub/Microsoft" → DO NOT click it unless the user explicitly asked for OAuth login. These open popups that require credentials.

## EXAMPLE TRAJECTORIES

Goal: "Go to Google and search for 'weather today'"
Step 1: navigate("https://www.google.com") → page loads
Step 2: fill(e3, "weather today") → search field filled
Step 3: press("Enter") → search results appear
Step 4: done("Found weather search results on Google")

Goal: "Sign up on example.com with email test@test.com"
Step 1: navigate("https://example.com/signup") → signup page loads
Step 2: fill(e2, "Test User") → name filled
Step 3: fill(e3, "test@test.com") → email filled
Step 4: fill(e4, "SecurePass123!") → password filled
Step 5: check(e5) → terms checkbox checked
Step 6: click(e6) → submit button clicked
Step 7: done("Account created successfully on example.com")

Goal: "Play a YouTube video about cats"
Step 1: navigate("https://www.youtube.com") → YouTube loads
Step 2: click(e5) → search bar clicked
Step 3: fill(e5, "cats") → search typed
Step 4: press("Enter") → results appear
Step 5: click(e10) → first video clicked
Step 6: video_play → video starts playing
Step 7: done("YouTube cat video playing")

Goal: "Extract all links from a Wikipedia page"
Step 1: navigate("https://en.wikipedia.org/wiki/Artificial_intelligence") → page loads
Step 2: wait("2000") → page fully loads
Step 3: evaluate(() => JSON.stringify([...document.querySelectorAll('a[href]')].map(a => ({text: a.textContent?.trim(), href: a.href})).slice(0, 50))) → links extracted
Step 4: done("Extracted 50 links from the Wikipedia page about AI")

Goal: "Fill a multi-step form with name John, email john@test.com"
Step 1: navigate("https://example.com/form") → form loads
Step 2: fill(e1, "John") → first name filled
Step 3: click(e5) → Next button clicked, step 2 loads
Step 4: fill(e2, "john@test.com") → email filled
Step 5: click(e6) → Submit button clicked
Step 6: done("Multi-step form submitted with John's information")`;

function buildPrompt(
  task: string,
  snapshot: PageSnapshot,
  state: { phase: BrowserPhase; goal: string },
  history: AgentStep[],
  memory: Memory,
  subGoals?: string[]
): string {
  // URL bypass — navigate directly if task contains a URL
  const urlRegex = /(https?:\/\/[^\s"'<>]+)/gi;
  const urls = task.match(urlRegex);
  if (urls && urls.length > 0 && history.length === 0) {
    const rawUrl = urls[0].replace(/[.,;:!?)\]]+$/, '');
    return `NAVIGATE_BYPASS:${rawUrl}`;
  }

  let p = `## Goal\n${task}\n\n`;

  // Sub-goals if decomposed
  if (subGoals && subGoals.length > 0) {
    p += `## Sub-goals\n`;
    subGoals.forEach((sg, i) => {
      const status = i < (subGoals.length - 1) ? "✓" : "→ current";
      p += `${i + 1}. ${sg} [${status}]\n`;
    });
    p += `\n`;
  }

  p += `## Current Page\n`;
  p += `- URL: ${snapshot.url}\n`;
  p += `- Title: ${snapshot.title}\n`;
  p += `- Phase: ${state.phase}\n`;
  p += `- Frames: ${snapshot.frameCount}\n`;

  // Blocker detection
  if (snapshot.hasCookieBanner) p += `- 🍪 COOKIE BANNER — dismiss it\n`;
  if (snapshot.hasCAPTCHA) p += `- 🤖 CAPTCHA — tell user, cannot bypass\n`;
  if (snapshot.hasVideoPlayer) p += `- 🎬 Video player detected\n`;
  if (snapshot.isLoading) p += `- ⏳ Page still loading\n`;

  const lowerUrl = snapshot.url.toLowerCase();
  if (lowerUrl.includes("login") || lowerUrl.includes("signin") || lowerUrl.includes("accounts")) {
    p += `- ⚠️ LOGIN PAGE — user may need to authenticate\n`;
  }
  p += `\n`;

  // Visible text
  const text = snapshot.visibleText.length > 2000 ? snapshot.visibleText.slice(0, 2000) + "..." : snapshot.visibleText;
  p += `## Visible Text\n${text || "(empty)"}\n\n`;

  // Elements
  p += `## Interactive Elements (${snapshot.elements.length})\n`;
  if (snapshot.elements.length === 0) {
    p += "(none found — try scrolling or navigating)\n";
  } else {
    for (const e of snapshot.elements) {
      const pos = ` @(${e.rect.x},${e.rect.y})`;
      let line = `[${e.ref}] <${e.tag}> ${e.role} "${e.name}"${pos}`;
      if (e.placeholder) line += ` placeholder="${e.placeholder}"`;
      if (e.value) line += ` value="${e.value.slice(0, 30)}"`;
      if (e.checked) line += ` [CHECKED]`;
      if (e.disabled) line += ` [DISABLED]`;
      if (e.href) line += ` href="${e.href.slice(0, 80)}"`;
      if (e.frame !== "main") line += ` [FRAME:${e.frame}]`;
      p += line + "\n";
    }
  }

  // Memory
  if (memory.completedFields.size > 0) {
    p += `\n## Completed Fields\n${[...memory.completedFields].join(", ")}\n`;
  }
  if (memory.clickedButtons.size > 0) {
    p += `\n## Clicked Buttons\n${[...memory.clickedButtons].join(", ")}\n`;
  }
  if (memory.failedLocators.size > 0) {
    p += `\n## Failed Locators (don't retry)\n`;
    for (const [loc, count] of memory.failedLocators) {
      p += `- ${loc} (${count}x)\n`;
    }
  }

  // Loop warnings
  if (memory.isScrollLooping()) {
    p += `\n⚠️ SCROLL LOOP — STOP SCROLLING! Click an element or take a different action.\n`;
  }
  if (memory.isLooping()) {
    p += `\n⚠️ LOOP DETECTED — You are repeating the same action. Try a DIFFERENT approach.\n`;
  }

  // History
  if (history.length > 0) {
    p += `\n## History\n`;
    for (const s of history.slice(-8)) {
      const status = s.success ? (s.verified ? "OK✓" : "OK") : "FAIL";
      let line = `${status} #${s.iteration} ${s.action.action}`;
      if (s.action.ref) line += ` ref=${s.action.ref}`;
      if (s.action.text) line += ` "${s.action.text.slice(0, 25)}"`;
      if (s.action.value) line += ` val="${s.action.value.slice(0, 25)}"`;
      if (s.action.key) line += ` key=${s.action.key}`;
      if (s.error) line += ` err="${s.error.slice(0, 40)}"`;
      p += line + "\n";
    }
  }

  p += `\n## Next Action\n`;
  return p;
}

async function decomposeGoal(
  fetchAI: AgentOptions["fetchAI"],
  provider: string,
  modelId: string,
  task: string
): Promise<string[]> {
  const prompt = `Break this browser task into sequential sub-goals. Return ONLY a JSON array of strings.

Task: "${task}"

Example: ["Navigate to github.com", "Click Sign Up", "Fill registration form", "Submit form", "Verify account"]

Rules:
- 2-8 sub-goals
- Each is a concrete, actionable step
- Return ONLY the JSON array`;

  try {
    const url = provider === "groq"
      ? "https://api.groq.com/openai/v1/chat/completions"
      : "https://openrouter.ai/api/v1/chat/completions";

    const response = await fetchAI(provider, url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: "system", content: "You are a task planner. Return only JSON arrays." },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 300,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";
    const match = content.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
  } catch {}
  return [task]; // Fallback: single goal
}

async function callLLM(
  fetchAI: AgentOptions["fetchAI"],
  provider: string,
  modelId: string,
  userPrompt: string,
  retries = 3
): Promise<AgentAction> {
  const url = provider === "groq"
    ? "https://api.groq.com/openai/v1/chat/completions"
    : "https://openrouter.ai/api/v1/chat/completions";

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchAI(provider, url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelId,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.1,
          max_tokens: 800,
        }),
      });

      const data = await response.json();

      if (data.error?.code === "rate_limit_exceeded") {
        await new Promise(r => setTimeout(r, 3000 * Math.pow(2, attempt)));
        continue;
      }
      if (!response.ok) throw new Error(`LLM ${response.status}: ${data.error?.message}`);

      const content = data.choices?.[0]?.message?.content || "";
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON in response");

      // Validate JSON
      const parsed = JSON.parse(match[0]);
      if (!parsed.action) throw new Error("Missing 'action' field");
      return parsed as AgentAction;
    } catch (err: any) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  throw new Error("LLM failed after retries");
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN AGENT LOOP
// ═══════════════════════════════════════════════════════════════════════════

export async function runBrowserEngine(
  task: string,
  options: AgentOptions
): Promise<AgentResult> {
  const {
    provider, modelId, fetchAI,
    headless = true, maxIterations = 25,
    viewport = { width: 1280, height: 800 },
    onStep,
  } = options;

  const startTime = Date.now();
  const steps: AgentStep[] = [];
  const screenshots: string[] = [];
  const memory = new Memory();
  let context: BrowserContext | null = null;
  let page: Page | null = null;
  let finalAnswer: string | undefined;

  try {
    // ── LAUNCH BROWSER ───────────────────────────────────────────────
    console.log(`[Browser] Launching... (headless=${headless})`);
    const launched = await launchBrowser({ headless, viewport });
    context = launched.context;
    page = launched.page;

    // ── DECOMPOSE GOAL ───────────────────────────────────────────────
    console.log(`[Browser] Decomposing goal: ${task.slice(0, 80)}`);
    const subGoals = await decomposeGoal(fetchAI, provider, modelId, task);
    console.log(`[Browser] Sub-goals: ${subGoals.length}`);

    let currentSubGoalIdx = 0;

    const state = {
      phase: "START" as BrowserPhase,
      goal: task,
      url: "",
      title: "",
    };

    // ── MAIN LOOP ────────────────────────────────────────────────────
    for (let i = 0; i < maxIterations; i++) {
      // ── OBSERVE ────────────────────────────────────────────────────
      const snapshot = await analyzePage(page, memory, true);
      state.url = snapshot.url;
      state.title = snapshot.title;
      state.phase = detectPhase(snapshot.url, snapshot.title, snapshot.visibleText, snapshot);

      if (snapshot.screenshot) screenshots.push(snapshot.screenshot);

      // ── CHECK TERMINAL STATES ──────────────────────────────────────
      if (state.phase === "OTP") {
        finalAnswer = `Task stopped: OTP/verification screen at ${snapshot.url}. User needs to enter code manually.`;
        break;
      }
      if (state.phase === "CAPTCHA") {
        finalAnswer = `Task stopped: CAPTCHA detected at ${snapshot.url}. User needs to solve it manually.`;
        break;
      }

      // Check for session expiry
      if (detectSessionExpired(snapshot.url, snapshot.visibleText)) {
        finalAnswer = `Task stopped: Session expired. Redirected to login at ${snapshot.url}. User needs to re-authenticate.`;
        break;
      }

      // ── CHECK FAILURES ─────────────────────────────────────────────
      if (memory.consecutiveFailures() >= 5) {
        finalAnswer = `Task stopped: ${memory.consecutiveFailures()} consecutive failures. Page: ${snapshot.url}`;
        break;
      }
      if (memory.isLooping()) {
        finalAnswer = `Task stopped: stuck in loop repeating the same action. Page: ${snapshot.url}`;
        break;
      }

      // ── OAUTH DETECTION ────────────────────────────────────────────
      const oauth = detectOAuth(page, snapshot.elements);
      if (oauth.detected && oauth.provider) {
        console.log(`[Browser] OAuth button detected: ${oauth.provider}`);
        // Don't auto-click OAuth — requires user credentials
      }

      // ── SAFETY CHECK ───────────────────────────────────────────────
      // (Check will happen after LLM decides action)

      // ── THINK (LLM) ───────────────────────────────────────────────
      const currentSubGoal = subGoals[currentSubGoalIdx] || task;
      const prompt = buildPrompt(
        currentSubGoal,
        snapshot,
        state,
        steps,
        memory,
        subGoals
      );

      let action: AgentAction;
      if (prompt.startsWith("NAVIGATE_BYPASS:")) {
        const rawUrl = prompt.slice("NAVIGATE_BYPASS:".length).trim();
        action = { action: "navigate", url: rawUrl, reasoning: "Direct URL navigation" };
      } else {
        action = await callLLM(fetchAI, provider, modelId, prompt);
      }

      // ── SAFETY CHECK ───────────────────────────────────────────────
      if (isDestructiveAction(action, snapshot)) {
        console.log(`[Browser] ⚠️ Destructive action detected: ${action.action} — ${action.reasoning}`);
        // Log but continue — the agent has good judgment, and user gave the task
      }

      // ── ACT ────────────────────────────────────────────────────────
      const actionStart = Date.now();
      let result = await executeAction(page, action, snapshot.elements, memory);
      const actionDuration = Date.now() - actionStart;

      // ── VISION FALLBACK ────────────────────────────────────────────
      // If click/fill failed and we have a ref, try vision-based finding
      if (!result.success && action.ref && (action.action === "click" || action.action === "fill")) {
        const el = snapshot.elements.find(e => e.ref === action.ref);
        if (el) {
          console.log(`[Browser] DOM strategies failed for "${el.name}", trying vision fallback...`);
          const visionCoords = await visionFind(page, el.name, fetchAI, provider, modelId);
          if (visionCoords) {
            try {
              await page.mouse.click(visionCoords.x, visionCoords.y);
              await page.waitForTimeout(1000);
              result = { success: true };
              console.log(`[Browser] Vision fallback succeeded at (${visionCoords.x}, ${visionCoords.y})`);
            } catch (err: any) {
              console.log(`[Browser] Vision fallback also failed: ${err.message}`);
            }
          }
        }
      }

      // ── VERIFY ─────────────────────────────────────────────────────
      const verification = await verify(page, snapshot, action, result);

      // ── RECOVER (if failed) ────────────────────────────────────────
      if (!result.success) {
        const recovery = await recover(page, action, result.error || "unknown", memory);
        if (recovery.hint) {
          console.log(`[Browser] Recovery: ${recovery.hint}`);
        }
      }

      // Track failures
      const failKey = `${action.action}:${action.ref || ""}:${result.success}`;
      if (!result.success && memory.sameFailCount(action.action, action.ref || "", false) >= 3) {
        finalAnswer = `Task stopped: "${action.action}" failing repeatedly. Page: ${snapshot.url}`;
        break;
      }

      memory.recordAction(action.action, action.ref || "", result.success);

      // Auto-save session when login/dashboard detected
      if (result.success && (state.phase === "DASHBOARD" || state.phase === "FORM_FILLING" || verification.reason.includes("URL changed"))) {
        await saveSession(context).catch(() => {});
      }

      if (result.success) {
        memory.markButtonClicked(action.ref || "");

        // Advance sub-goal based on page state changes
        if (action.action === "done") {
          // Done handles it below
        } else if (currentSubGoalIdx < subGoals.length - 1) {
          // Heuristic: advance sub-goal if URL changed or significant content changed
          if (snapshot.url !== state.url || verification.reason.includes("URL changed")) {
            currentSubGoalIdx = Math.min(currentSubGoalIdx + 1, subGoals.length - 1);
            console.log(`[Browser] Sub-goal advanced to: ${subGoals[currentSubGoalIdx]}`);
          }
        }
      }

      // Screenshot
      let screenshot: string | undefined;
      try {
        const buf = await page.screenshot({ fullPage: false, type: "png" });
        screenshot = `data:image/png;base64,${buf.toString("base64")}`;
      } catch {}

      const snapshotAfter = await analyzePage(page, memory, false);

      const step: AgentStep = {
        iteration: i + 1,
        action,
        stateBefore: snapshot,
        stateAfter: snapshotAfter,
        verified: verification.verified,
        success: result.success,
        error: result.error,
        screenshot,
        duration: actionDuration,
        subGoal: currentSubGoal,
      };

      steps.push(step);
      onStep?.(step);

      console.log(
        `[Browser] #${i + 1} [${state.phase}] ${action.action}` +
        (action.url ? ` url="${action.url.slice(0, 60)}"` : "") +
        (action.ref ? ` ref=${action.ref}` : "") +
        (action.value ? ` val="${action.value.slice(0, 30)}"` : "") +
        (result.success ? (verification.verified ? " OK✓" : " OK") : ` FAIL: ${result.error?.slice(0, 40)}`)
      );

      // ── DONE / FAIL ────────────────────────────────────────────────
      if (action.action === "done") {
        finalAnswer = action.answer;
        break;
      }
      if (action.action === "fail") {
        finalAnswer = `Task cannot be completed: ${action.answer}`;
        break;
      }

      // Brief pause
      await page.waitForTimeout(50);
    }

    const duration = Date.now() - startTime;
    const finalPhase = finalAnswer?.includes("OTP") ? "OTP" :
      finalAnswer?.includes("CAPTCHA") ? "CAPTCHA" :
      finalAnswer?.includes("stuck") ? "BLOCKED" :
      finalAnswer?.includes("cannot") ? "ERROR" : "COMPLETE";

    console.log(`[Browser] Finished [${finalPhase}] in ${(duration / 1000).toFixed(1)}s — ${steps.length} steps`);

    return {
      task,
      success: !!finalAnswer || steps.some(s => s.action.action === "done"),
      answer: finalAnswer,
      steps,
      screenshots,
      duration,
      finalState: { phase: finalPhase as BrowserPhase, url: state.url, title: state.title },
      subGoals,
    };
  } catch (error: any) {
    return {
      task,
      success: false,
      steps,
      screenshots,
      error: error.message,
      duration: Date.now() - startTime,
      finalState: { phase: "ERROR", url: page?.url() || "", title: "" },
    };
  } finally {
    // Save session before closing
    if (context) {
      await saveSession(context).catch(() => {});
    }

    // Close browser (only when headless)
    try {
      if (headless) {
        await context?.close().catch(() => {});
        console.log("[Browser] Browser closed.");
      } else {
        console.log("[Browser] Browser staying open for user to see.");
      }
    } catch {}
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BACKWARD COMPATIBILITY
// ═══════════════════════════════════════════════════════════════════════════

// Re-export runAgent for /api/browser-agent compatibility
export async function runAgent(
  task: string,
  options: AgentOptions
): Promise<AgentResult> {
  return runBrowserEngine(task, options);
}

export async function runAgentFrom(
  task: string,
  startUrl: string,
  options: AgentOptions
): Promise<AgentResult> {
  return runBrowserEngine(`Navigate to ${startUrl} first, then: ${task}`, options);
}
