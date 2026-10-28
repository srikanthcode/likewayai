// ══════════════════════════════════════════════════════════════════════
// LIKEWAY AI — COMPUTER CONTROL & SYSTEM AUTOMATION
// Detects user system apps, controls computer access, and launches
// desktop or web applications with user confirmation / auto-launch.
// ══════════════════════════════════════════════════════════════════════

import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// ── Input hardening ────────────────────────────────────────────────────────
// Nothing user-supplied is ever interpolated into a shell string. Values are
// either validated against a strict charset or handed to the child process
// through an environment variable, so PowerShell only ever evaluates a
// constant script template.

/** App names we are willing to search for. */
const SAFE_APP_NAME = /^[A-Za-z0-9 ._+\-]{1,40}$/;
/** Package family identifiers returned by Get-StartApps. */
const SAFE_APP_ID = /^[A-Za-z0-9._!\-]{1,200}$/;

export function isSafeAppName(value: unknown): value is string {
  return typeof value === "string" && SAFE_APP_NAME.test(value.trim());
}

function isSafeAppId(value: unknown): value is string {
  return typeof value === "string" && SAFE_APP_ID.test(value);
}

/** Only http(s) URLs may be handed to the OS "open" handler. */
function isSafeExternalUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

async function runPowerShell(script: string, env: Record<string, string>, timeout: number) {
  return execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
    timeout,
    windowsHide: true,
    maxBuffer: 1024 * 1024,
    env: { ...process.env, ...env },
  });
}

/**
 * OS-level control only works when this server runs on the user's OWN machine.
 * On a hosted deployment (Render/Vercel) it would shell out inside a container,
 * so callers must refuse instead of launching apps in the cloud.
 */
export function isLocalExecutionHost(): boolean {
  if (process.env.RENDER || process.env.RENDER_EXTERNAL_URL) return false;
  if (process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview") return false;
  return process.platform === "win32" || process.platform === "darwin" || process.platform === "linux";
}

export interface SystemAppInfo {
  id: string;
  name: string;
  displayName: string;
  category: "communication" | "media" | "productivity" | "utilities" | "development" | "browser" | "system";
  protocol?: string;
  webUrl?: string;
  defaultExe?: string;
  appIdPattern?: RegExp;
  description: string;
}

export const KNOWN_SYSTEM_APPS: SystemAppInfo[] = [
  {
    id: "whatsapp",
    name: "whatsapp",
    displayName: "WhatsApp",
    category: "communication",
    protocol: "whatsapp://",
    webUrl: "https://web.whatsapp.com",
    defaultExe: "WhatsApp.exe",
    appIdPattern: /whatsapp/i,
    description: "WhatsApp Desktop messaging client",
  },
  {
    id: "spotify",
    name: "spotify",
    displayName: "Spotify",
    category: "media",
    protocol: "spotify://",
    webUrl: "https://open.spotify.com",
    defaultExe: "Spotify.exe",
    appIdPattern: /spotify/i,
    description: "Spotify music & podcast streaming",
  },
  {
    id: "calculator",
    name: "calculator",
    displayName: "Calculator",
    category: "utilities",
    protocol: "calculator://",
    defaultExe: "calc.exe",
    appIdPattern: /calculator/i,
    description: "Windows Calculator application",
  },
  {
    id: "notepad",
    name: "notepad",
    displayName: "Notepad",
    category: "productivity",
    defaultExe: "notepad.exe",
    appIdPattern: /notepad/i,
    description: "Text editor",
  },
  {
    id: "vscode",
    name: "vscode",
    displayName: "Visual Studio Code",
    category: "development",
    protocol: "vscode://",
    webUrl: "https://vscode.dev",
    defaultExe: "code",
    appIdPattern: /code/i,
    description: "Code editor & development environment",
  },
  {
    id: "chrome",
    name: "chrome",
    displayName: "Google Chrome",
    category: "browser",
    webUrl: "https://www.google.com",
    defaultExe: "chrome.exe",
    appIdPattern: /chrome/i,
    description: "Web browser",
  },
  {
    id: "edge",
    name: "edge",
    displayName: "Microsoft Edge",
    category: "browser",
    webUrl: "https://www.bing.com",
    defaultExe: "msedge.exe",
    appIdPattern: /edge/i,
    description: "Microsoft Edge browser",
  },
  {
    id: "discord",
    name: "discord",
    displayName: "Discord",
    category: "communication",
    protocol: "discord://",
    webUrl: "https://discord.com/app",
    defaultExe: "Discord.exe",
    appIdPattern: /discord/i,
    description: "Discord voice & text chat",
  },
  {
    id: "telegram",
    name: "telegram",
    displayName: "Telegram",
    category: "communication",
    protocol: "tg://",
    webUrl: "https://web.telegram.org",
    defaultExe: "Telegram.exe",
    appIdPattern: /telegram/i,
    description: "Telegram messaging client",
  },
  {
    id: "youtube",
    name: "youtube",
    displayName: "YouTube",
    category: "media",
    webUrl: "https://www.youtube.com",
    description: "YouTube video streaming",
  },
  {
    id: "excel",
    name: "excel",
    displayName: "Microsoft Excel",
    category: "productivity",
    webUrl: "https://office.com/launch/excel",
    defaultExe: "excel.exe",
    appIdPattern: /excel/i,
    description: "Spreadsheet editor",
  },
  {
    id: "word",
    name: "word",
    displayName: "Microsoft Word",
    category: "productivity",
    webUrl: "https://office.com/launch/word",
    defaultExe: "winword.exe",
    appIdPattern: /word/i,
    description: "Document editor",
  },
  {
    id: "powerpoint",
    name: "powerpoint",
    displayName: "Microsoft PowerPoint",
    category: "productivity",
    webUrl: "https://office.com/launch/powerpoint",
    defaultExe: "powerpnt.exe",
    appIdPattern: /powerpoint/i,
    description: "Presentation editor",
  },
  {
    id: "settings",
    name: "settings",
    displayName: "Windows Settings",
    category: "system",
    protocol: "ms-settings:",
    defaultExe: "ms-settings:",
    description: "System settings",
  },
  {
    id: "taskmgr",
    name: "taskmgr",
    displayName: "Task Manager",
    category: "system",
    defaultExe: "taskmgr.exe",
    description: "System task manager & process monitor",
  },
  {
    id: "terminal",
    name: "terminal",
    displayName: "Terminal / Command Prompt",
    category: "development",
    defaultExe: "wt.exe",
    description: "Command line shell",
  },
  {
    id: "paint",
    name: "paint",
    displayName: "Paint",
    category: "utilities",
    defaultExe: "mspaint.exe",
    appIdPattern: /paint/i,
    description: "Image drawing tool",
  },
  {
    id: "camera",
    name: "camera",
    displayName: "Camera",
    category: "media",
    protocol: "microsoft.windows.camera:",
    description: "Webcam & camera app",
  },
];

export interface AppDetectionResult {
  foundOnSystem: boolean;
  appId?: string;
  appName: string;
  displayName: string;
  exePath?: string;
  protocol?: string;
  webUrl?: string;
}

export interface AppLaunchResult extends AppDetectionResult {
  success: boolean;
  message: string;
  launchedVia: "start_apps" | "protocol" | "executable" | "web_fallback" | "none";
  error?: string;
}

/**
 * Detects whether a prompt has computer control / app launch intent
 */
export function detectComputerControlIntent(prompt: string): {
  isComputerControl: boolean;
  targetApp?: string;
  action?: "open" | "find" | "check" | "close";
} {
  const clean = prompt.trim().toLowerCase();

  // Pattern: (open|launch|start|run|find|check if i have) [app]
  const openMatch = clean.match(
    /\b(?:open|launch|start|run|fire up|find and open|pull up)\s+([a-z0-9\- \._]+)/i
  );
  const findMatch = clean.match(
    /\b(?:find|check if (?:i have|system has)|do i have|locate|search for)\s+([a-z0-9\- \._]+)/i
  );

  if (openMatch) {
    let target = openMatch[1].trim();
    // Strip trailing words like "in my computer", "app", "application", "in my system", "please"
    target = target
      .replace(/\b(app|application|in my system|in my computer|on my computer|on my pc|please|now|for me)\b/gi, "")
      .trim();

    if (target.length > 0 && target.length < 40) {
      return { isComputerControl: true, targetApp: target, action: "open" };
    }
  }

  if (findMatch) {
    let target = findMatch[1].trim();
    target = target
      .replace(/\b(app|application|installed|in my system|in my computer|on my computer|on my pc|please)\b/gi, "")
      .trim();

    if (target.length > 0 && target.length < 40) {
      return { isComputerControl: true, targetApp: target, action: "find" };
    }
  }

  // Also check direct keywords
  for (const app of KNOWN_SYSTEM_APPS) {
    if (new RegExp(`\\b(open|launch|start)\\s+${app.name}\\b`, "i").test(clean)) {
      return { isComputerControl: true, targetApp: app.name, action: "open" };
    }
  }

  return { isComputerControl: false };
}

/**
 * Searches the Windows system for installed apps matching the target name
 */
export async function findSystemApp(appName: string): Promise<AppDetectionResult> {
  if (!isSafeAppName(appName)) {
    return {
      foundOnSystem: false,
      appName: String(appName).slice(0, 40),
      displayName: "Unsupported app name",
      protocol: undefined,
      webUrl: undefined,
    };
  }
  const normalized = appName.toLowerCase().trim();
  const known = KNOWN_SYSTEM_APPS.find(
    (a) => a.id === normalized || a.name === normalized || a.displayName.toLowerCase() === normalized
  );

  let displayName = known?.displayName || appName;
  let protocol = known?.protocol;
  let webUrl = known?.webUrl;

  const isWindows = process.platform === "win32";

  if (!isWindows) {
    // Non-Windows environment fallback
    return {
      foundOnSystem: false,
      appName,
      displayName,
      protocol,
      webUrl: webUrl || `https://www.google.com/search?q=${encodeURIComponent(appName)}`,
    };
  }

  // Check via Windows Get-StartApps.
  // The search term travels through an environment variable, so the script is a
  // constant and the value can never break out into executable PowerShell.
  try {
    const searchPattern = known?.name || normalized;
    const { stdout } = await runPowerShell(
      'Get-StartApps | Where-Object { $_.Name -like "*$env:LW_APP_SEARCH*" } | Select-Object -First 1 | ConvertTo-Json',
      { LW_APP_SEARCH: searchPattern },
      8000
    );

    if (stdout && stdout.trim()) {
      try {
        const parsed = JSON.parse(stdout.trim());
        if (isSafeAppId(parsed.AppID)) {
          return {
            foundOnSystem: true,
            appId: parsed.AppID,
            appName,
            displayName: parsed.Name || displayName,
            protocol,
            webUrl,
          };
        }
      } catch {}
    }
  } catch (e) {
    // Fall back to known definitions or where.exe
  }

  // Check if executable exists via where.exe
  if (known?.defaultExe) {
    try {
      const { stdout } = await execFileAsync("where.exe", [known.defaultExe], {
        timeout: 3000,
        windowsHide: true,
      });
      if (stdout && stdout.trim()) {
        const exePath = stdout.trim().split("\n")[0].trim();
        return {
          foundOnSystem: true,
          appName,
          displayName,
          exePath,
          protocol,
          webUrl,
        };
      }
    } catch {}
  }

  // If known app with valid protocol/webUrl, mark found or known
  return {
    foundOnSystem: false,
    appName,
    displayName,
    protocol,
    webUrl: webUrl || `https://www.google.com/search?q=${encodeURIComponent(appName)}`,
  };
}

/**
 * Finds and launches the requested application on the user's computer
 */
export async function launchSystemApp(appName: string): Promise<AppLaunchResult> {
  const detection = await findSystemApp(appName);
  const isWindows = process.platform === "win32";

  // 1. Launch via Windows AppID (StartApps package)
  if (detection.foundOnSystem && detection.appId && isWindows && isSafeAppId(detection.appId)) {
    try {
      // shell:AppsFolder\<AppID> launches any UWP or packaged app cleanly.
      // The target is passed as data, never as script text.
      await runPowerShell("Start-Process $env:LW_LAUNCH_TARGET", {
        LW_LAUNCH_TARGET: `shell:AppsFolder\\${detection.appId}`,
      }, 6000);

      return {
        ...detection,
        success: true,
        launchedVia: "start_apps",
        message: `Successfully launched ${detection.displayName} on your computer.`,
      };
    } catch (err: any) {
      console.warn(`[ComputerControl] AppID launch failed: ${err.message}`);
    }
  }

  // 2. Launch via native URI Protocol (e.g. whatsapp://, spotify://, calc:)
  // Protocols come only from the static KNOWN_SYSTEM_APPS table.
  const knownProtocol = KNOWN_SYSTEM_APPS.find((a) => a.protocol === detection.protocol)?.protocol;
  if (knownProtocol && isWindows) {
    try {
      await runPowerShell("Start-Process $env:LW_LAUNCH_TARGET", {
        LW_LAUNCH_TARGET: knownProtocol,
      }, 5000);

      return {
        ...detection,
        success: true,
        launchedVia: "protocol",
        message: `Launched ${detection.displayName} via native desktop protocol.`,
      };
    } catch (err: any) {
      console.warn(`[ComputerControl] Protocol launch failed: ${err.message}`);
    }
  }

  // 3. Launch via executable name
  const known = KNOWN_SYSTEM_APPS.find((a) => a.id === appName.toLowerCase().trim());
  const exeToRun = detection.exePath || known?.defaultExe;
  if (exeToRun && isWindows && isSafeAppName(exeToRun)) {
    try {
      await runPowerShell("Start-Process -FilePath $env:LW_LAUNCH_EXE", {
        LW_LAUNCH_EXE: exeToRun,
      }, 5000);

      return {
        ...detection,
        success: true,
        launchedVia: "executable",
        message: `Started ${detection.displayName} application.`,
      };
    } catch (err: any) {
      console.warn(`[ComputerControl] Executable launch failed: ${err.message}`);
    }
  }

  // 4. Web fallback if desktop launch unavailable or not running on local Windows
  if (detection.webUrl) {
    if (isWindows && isSafeExternalUrl(detection.webUrl)) {
      try {
        await runPowerShell("Start-Process $env:LW_LAUNCH_URL", {
          LW_LAUNCH_URL: detection.webUrl,
        }, 5000);
        return {
          ...detection,
          success: true,
          launchedVia: "web_fallback",
          message: `Opened ${detection.displayName} Web in your default browser.`,
        };
      } catch {}
    }

    return {
      ...detection,
      success: true,
      launchedVia: "web_fallback",
      message: `Direct web link ready for ${detection.displayName}.`,
    };
  }

  return {
    ...detection,
    success: false,
    launchedVia: "none",
    message: `Could not locate ${appName} on your system.`,
  };
}

/**
 * Formats a clean, high-grade markdown card for computer control execution
 */
export function formatComputerControlCard(result: AppLaunchResult): string {
  const statusIcon = result.success ? "✅" : "⚠️";
  const actionText = result.success ? "Launched on your computer" : "System scan completed";

  let out = `### 🖥️ Computer Control — Application Manager\n\n`;
  out += `| Property | Details |\n`;
  out += `|---|---|\n`;
  out += `| **Target Application** | **${result.displayName}** |\n`;
  out += `| **System Detection** | ${result.foundOnSystem ? "Found in Windows Start Apps ✅" : "Web / Protocol Service Ready 🌐"} |\n`;
  if (result.appId) {
    out += `| **App Package** | \`${result.appId.slice(0, 45)}...\` |\n`;
  }
  out += `| **Execution Status** | ${statusIcon} ${actionText} |\n\n`;

  out += `> ${result.message}\n\n`;

  // Quick Action Links
  const links: string[] = [];
  if (result.protocol) {
    links.push(`[👉 Launch Desktop App](${result.protocol})`);
  }
  if (result.webUrl) {
    links.push(`[🌐 Open in Web](${result.webUrl})`);
  }

  if (links.length > 0) {
    out += `**Quick Actions:** ${links.join(" · ")}\n\n`;
  }

  out += `*LikeWay Computer Control automatically finds, validates, and launches apps directly on your computer.*`;
  return out;
}
