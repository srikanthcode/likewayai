#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════
// LIKEWAY AI — LOCAL COMPANION AGENT (DESKTOP EXECUTION ENGINE)
// ══════════════════════════════════════════════════════════════════════
// Runs on the user's own machine and acts as the physical hands for the
// Likeway AI brain. Hardened:
//   • Strict CORS allowlist (no `*`)
//   • Pairing token required on every request (X-Likeway-Token)
//   • Destructive-command blocklist
//   • Global kill switch (POST /api/kill, or Ctrl+C)
// Capabilities: app launching, safe terminal exec, project scaffolding,
// local dev servers, desktop browser opening, endpoint verification.
// ══════════════════════════════════════════════════════════════════════

const http = require("http");
const crypto = require("crypto");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const url = require("url");

const PORT = process.env.LIKEWAY_COMPANION_PORT || 4141;
const HOST = "127.0.0.1";

// ── Security configuration ─────────────────────────────────────────────
const ALLOWED_ORIGINS = new Set(
  (process.env.LIKEWAY_ALLOWED_ORIGINS ||
    "https://likeway.ai,https://www.likeway.ai,http://localhost:3000,http://127.0.0.1:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean)
);

const PAIRING_TOKEN =
  process.env.LIKEWAY_PAIR_TOKEN || crypto.randomBytes(24).toString("hex");

function tokenMatches(candidate) {
  if (typeof candidate !== "string") return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(PAIRING_TOKEN);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

let shuttingDown = false;

// Workspace root for autonomous projects: ~/LikewayProjects
const USER_HOME = os.homedir();
const DEFAULT_WORKSPACE = path.join(USER_HOME, "LikewayProjects");
if (!fs.existsSync(DEFAULT_WORKSPACE)) {
  try {
    fs.mkdirSync(DEFAULT_WORKSPACE, { recursive: true });
  } catch (e) {
    console.warn("[Companion] Could not create default workspace:", e.message);
  }
}

// Track active child processes (dev servers, long-running tasks)
const activeProcesses = new Map();

function corsHeaders(origin) {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
    Vary: "Origin",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type, X-Likeway-Token";
    headers["Access-Control-Max-Age"] = "600";
  }
  return headers;
}

function sendJson(res, statusCode, data, origin) {
  res.writeHead(statusCode, corsHeaders(origin));
  res.end(JSON.stringify(data));
}

// Command safety validation
const DANGEROUS_PATTERNS = [
  /\brm\s+-rf\s+[\/\\]/i,
  /\bformat\s+[c-z]:/i,
  /\bdel\s+\/f\s+\/s\s+\/q\s+[c-z]:\\windows/i,
  /\bdiskpart\b/i,
  /\bshutdown\b/i,
  /\bmkfs\b/i,
  /:(){ :|:& };:/, // Fork bomb
];

function isCommandSafe(cmd) {
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(cmd)) return false;
  }
  return true;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) {
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error("Invalid JSON: " + err.message));
      }
    });
    req.on("error", reject);
  });
}

/**
 * Enforce origin + pairing token. Returns true if the request may proceed.
 * Writes the error response itself when it must reject.
 */
function authorize(req, res) {
  const origin = req.headers.origin;

  // Browser requests from an unlisted origin are refused outright.
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    sendJson(res, 403, { error: "Forbidden origin" }, origin);
    return false;
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders(origin));
    res.end();
    return false;
  }

  // Reject simple cross-site form posts and any request without the token.
  const token = req.headers["x-likeway-token"];
  if (!tokenMatches(token)) {
    sendJson(res, 401, { error: "Invalid or missing X-Likeway-Token" }, origin);
    return false;
  }

  return true;
}

function killEverything() {
  shuttingDown = true;
  for (const [, instance] of activeProcesses.entries()) {
    try {
      if (instance.server) instance.server.close();
    } catch {}
  }
  activeProcesses.clear();
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;

  // CORS preflight is answered before auth so the browser can read headers.
  if (req.method === "OPTIONS") {
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return sendJson(res, 403, { error: "Forbidden origin" }, origin);
    }
    res.writeHead(204, corsHeaders(origin));
    return res.end();
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // ── 1. Health Check (allowed for connection check; full details token-gated) ──
  if (pathname === "/health" || pathname === "/api/health") {
    const token = req.headers["x-likeway-token"];
    const isAuth = token && tokenMatches(token);
    return sendJson(res, 200, {
      status: "ok",
      agent: "Likeway Local Companion",
      version: "1.1.0",
      platform: os.platform(),
      uptime: Math.round(process.uptime()),
      activeProcesses: activeProcesses.size,
      ...(isAuth ? {
        arch: os.arch(),
        hostname: os.hostname(),
        username: os.userInfo().username,
        homeDir: USER_HOME,
        workspace: DEFAULT_WORKSPACE,
      } : {})
    }, origin);
  }

  // Token authentication required for all functional companion endpoints
  if (!authorize(req, res)) return;
  if (shuttingDown) {
    return sendJson(res, 503, { error: "Companion is shutting down" }, origin);
  }

  try {

    // ── 2. Kill switch ────────────────────────────────────────────────
    if (pathname === "/api/kill" && req.method === "POST") {
      killEverything();
      sendJson(res, 200, { success: true, message: "All companion activity stopped." }, origin);
      console.log("[Companion] Kill switch activated. Stopping servers and exiting.");
      setTimeout(() => process.exit(0), 250);
      return;
    }

    // ── 3. Discover Installed Desktop Applications ───────────────────
    if (pathname === "/api/apps/detect" && req.method === "POST") {
      const body = await parseBody(req);
      const query = (body.name || "").toLowerCase().replace(/[^a-z0-9 _-]/g, "").trim();

      if (os.platform() === "win32") {
        const psScript = `
          Get-StartApps | Where-Object { $_.Name -like "*${query}*" } | Select-Object -First 5 Name, AppID | ConvertTo-Json
        `;
        exec(psScript, { shell: "powershell.exe", timeout: 5000 }, (err, stdout) => {
          let found = [];
          try {
            if (stdout && stdout.trim()) {
              const parsed = JSON.parse(stdout);
              found = Array.isArray(parsed) ? parsed : [parsed];
            }
          } catch {}
          sendJson(res, 200, { success: true, query, apps: found, found: found.length > 0 }, origin);
        });
        return;
      }

      return sendJson(res, 200, {
        success: true,
        query,
        apps: [],
        found: false,
        message: "App detection primarily optimized for Windows",
      }, origin);
    }

    // ── 4. Launch Desktop Application Locally ────────────────────────
    if (pathname === "/api/apps/launch" && req.method === "POST") {
      const body = await parseBody(req);
      const appName = body.appName || body.name;
      const protocol = body.protocol;
      const exe = body.exe;
      const webUrl = body.webUrl;

      if (!appName && !protocol && !exe && !webUrl) {
        return sendJson(res, 400, { error: "appName, protocol, exe or webUrl is required" }, origin);
      }

      if (protocol) {
        if (!/^[a-z][a-z0-9+.-]*:$/i.test(String(protocol))) {
          return sendJson(res, 400, { error: "Invalid protocol" }, origin);
        }
        const cmd = os.platform() === "win32" ? `Start-Process "${protocol}"` : `open "${protocol}"`;
        exec(cmd, { shell: os.platform() === "win32" ? "powershell.exe" : "/bin/bash", timeout: 5000 }, (err) => {
          if (!err) {
            return sendJson(res, 200, { success: true, launchedVia: "protocol", target: protocol, message: `Launched ${appName || protocol}` }, origin);
          }
          launchFallback(appName, exe, webUrl, res, origin);
        });
        return;
      }

      launchFallback(appName, exe, webUrl, res, origin);
      return;
    }

    // ── 5. Terminal Command Execution ────────────────────────────────
    if (pathname === "/api/terminal/exec" && req.method === "POST") {
      const body = await parseBody(req);
      const command = body.command;
      const cwd = body.cwd || DEFAULT_WORKSPACE;
      const timeout = Math.min(body.timeout || 60000, 180000);

      if (!command) {
        return sendJson(res, 400, { error: "command is required" }, origin);
      }

      if (!isCommandSafe(command)) {
        return sendJson(res, 403, { success: false, error: "Command blocked by security policy" }, origin);
      }

      console.log(`[Companion] Executing command in [${cwd}]: ${command}`);
      const startTime = Date.now();
      const shell = os.platform() === "win32" ? "powershell.exe" : "/bin/bash";

      exec(command, {
        cwd,
        shell,
        timeout,
        maxBuffer: 5 * 1024 * 1024,
        env: { ...process.env, NODE_ENV: "development" },
      }, (error, stdout, stderr) => {
        const exitCode = error ? (error.code ?? 1) : 0;
        sendJson(res, 200, {
          success: exitCode === 0,
          exitCode,
          stdout: stdout || "",
          stderr: stderr || (error ? error.message : ""),
          duration: Date.now() - startTime,
          cwd,
          command,
        }, origin);
      });
      return;
    }

    // ── 6. Filesystem: Create Project & Write Files ──────────────────
    if (pathname === "/api/fs/write-project" && req.method === "POST") {
      const body = await parseBody(req);
      const projectName = (body.projectName || "autonomous-project").replace(/[^a-zA-Z0-9_-]/g, "_");
      const files = body.files || [];
      const projectDir = path.join(DEFAULT_WORKSPACE, projectName);

      if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true });
      }

      const writtenFiles = [];
      for (const f of files) {
        // Prevent path traversal outside the project directory.
        const filePath = path.normalize(path.join(projectDir, f.path));
        if (!filePath.startsWith(projectDir)) {
          return sendJson(res, 403, { error: "Invalid file path" }, origin);
        }
        const fileDir = path.dirname(filePath);
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }
        fs.writeFileSync(filePath, f.content, "utf8");
        writtenFiles.push(f.path);
      }

      return sendJson(res, 200, { success: true, projectName, projectDir, filesCount: writtenFiles.length, writtenFiles }, origin);
    }

    // ── 7. Local Dev Server: Serve and Run Autonomous Project ────────
    if (pathname === "/api/server/start" && req.method === "POST") {
      const body = await parseBody(req);
      const projectName = body.projectName;
      const port = body.port || 8080;
      const projectDir = path.join(DEFAULT_WORKSPACE, projectName);

      if (!fs.existsSync(projectDir)) {
        return sendJson(res, 404, { error: `Project directory not found: ${projectDir}` }, origin);
      }

      if (activeProcesses.has(projectName)) {
        const existing = activeProcesses.get(projectName);
        return sendJson(res, 200, { success: true, status: "already_running", projectName, url: existing.url, port: existing.port }, origin);
      }

      const projectServer = http.createServer((pReq, pRes) => {
        let reqPath = url.parse(pReq.url).pathname;
        if (reqPath === "/") reqPath = "/index.html";

        const safePath = path.normalize(path.join(projectDir, reqPath));
        if (!safePath.startsWith(projectDir)) {
          pRes.writeHead(403);
          return pRes.end("Forbidden");
        }

        if (fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
          const ext = path.extname(safePath).toLowerCase();
          const mimeTypes = {
            ".html": "text/html", ".js": "application/javascript", ".css": "text/css",
            ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
            ".svg": "image/svg+xml", ".wav": "audio/wav", ".mp3": "audio/mpeg",
          };
          pRes.writeHead(200, { "Content-Type": mimeTypes[ext] || "text/plain" });
          return fs.createReadStream(safePath).pipe(pRes);
        }

        pRes.writeHead(404);
        pRes.end("File Not Found");
      });

      projectServer.listen(port, "127.0.0.1", () => {
        const liveUrl = `http://localhost:${port}`;
        console.log(`[Companion] Project server live at ${liveUrl} for ${projectName}`);
        activeProcesses.set(projectName, { server: projectServer, url: liveUrl, port, projectDir, startedAt: Date.now() });

        if (body.openBrowser !== false) {
          openInDesktopBrowser(liveUrl);
        }

        sendJson(res, 200, { success: true, status: "started", projectName, url: liveUrl, port, projectDir, message: `Running at ${liveUrl}` }, origin);
      });

      projectServer.on("error", (err) => {
        sendJson(res, 500, { error: `Failed to start server: ${err.message}` }, origin);
      });
      return;
    }

    // ── 8. Stop Local Project Server ─────────────────────────────────
    if (pathname === "/api/server/stop" && req.method === "POST") {
      const body = await parseBody(req);
      const projectName = body.projectName;
      if (!activeProcesses.has(projectName)) {
        return sendJson(res, 200, { success: true, message: "No active server found" }, origin);
      }
      const instance = activeProcesses.get(projectName);
      if (instance.server) instance.server.close();
      activeProcesses.delete(projectName);
      return sendJson(res, 200, { success: true, projectName, message: "Stopped" }, origin);
    }

    // ── 9. Open Any URL in Physical Desktop Browser ──────────────────
    if (pathname === "/api/browser/open" && req.method === "POST") {
      const body = await parseBody(req);
      const targetUrl = body.url;
      if (!targetUrl || !/^https?:\/\//i.test(String(targetUrl))) {
        return sendJson(res, 400, { error: "A valid http(s) url is required" }, origin);
      }
      const success = openInDesktopBrowser(targetUrl);
      return sendJson(res, 200, { success, url: targetUrl, message: `Opened ${targetUrl}` }, origin);
    }

    // ── 10. Verify Endpoint Status ───────────────────────────────────
    if (pathname === "/api/verify/endpoint" && req.method === "POST") {
      const body = await parseBody(req);
      const targetUrl = body.url;
      if (!targetUrl || !/^https?:\/\//i.test(String(targetUrl))) {
        return sendJson(res, 400, { error: "A valid http(s) url is required" }, origin);
      }
      try {
        const checkRes = await fetch(targetUrl, { signal: AbortSignal.timeout(5000) });
        return sendJson(res, 200, { success: checkRes.ok, status: checkRes.status, statusText: checkRes.statusText, reachable: true }, origin);
      } catch (e) {
        return sendJson(res, 200, { success: false, error: e.message, reachable: false }, origin);
      }
    }

    sendJson(res, 404, { error: "Endpoint not found on Likeway Companion" }, origin);
  } catch (error) {
    console.error("[Companion] Internal Server Error:", error);
    sendJson(res, 500, { error: error.message || "Internal Companion Error" }, origin);
  }
});

// Helper: Open URL in user's physical desktop browser
function openInDesktopBrowser(targetUrl) {
  try {
    let cmd = "";
    if (os.platform() === "win32") {
      cmd = `Start-Process "${targetUrl}"`;
      exec(cmd, { shell: "powershell.exe" });
    } else if (os.platform() === "darwin") {
      cmd = `open "${targetUrl}"`;
      exec(cmd);
    } else {
      cmd = `xdg-open "${targetUrl}"`;
      exec(cmd);
    }
    return true;
  } catch (e) {
    console.warn("[Companion] Failed to open desktop browser:", e.message);
    return false;
  }
}

// Helper: Launch fallback (executable or web)
function launchFallback(appName, exe, webUrl, res, origin) {
  if (exe && os.platform() === "win32") {
    const safeExe = String(exe).replace(/["`]/g, "");
    exec(`Start-Process "${safeExe}"`, { shell: "powershell.exe", timeout: 5000 }, (err) => {
      if (!err) {
        return sendJson(res, 200, { success: true, launchedVia: "executable", target: exe, message: `Started ${appName || exe}` }, origin);
      }
      if (webUrl) {
        openInDesktopBrowser(webUrl);
        return sendJson(res, 200, { success: true, launchedVia: "webUrl", target: webUrl, message: `Opened ${appName || "Web Service"}` }, origin);
      }
      sendJson(res, 500, { success: false, error: "Failed to launch executable" }, origin);
    });
    return;
  }

  if (webUrl) {
    openInDesktopBrowser(webUrl);
    return sendJson(res, 200, { success: true, launchedVia: "webUrl", target: webUrl, message: `Opened ${appName || "Web Service"}` }, origin);
  }

  return sendJson(res, 404, { success: false, error: `Could not locate or launch ${appName || "application"}` }, origin);
}

// Start companion daemon
server.listen(PORT, HOST, () => {
  console.log(`
══════════════════════════════════════════════════════════════════════════
  🖥️  LIKEWAY AI — LOCAL COMPANION AGENT RUNNING (SECURED)
══════════════════════════════════════════════════════════════════════════
  Endpoint:        http://${HOST}:${PORT}
  Workspace:       ${DEFAULT_WORKSPACE}
  Platform:        ${os.platform()} (${os.arch()})
  Allowed origins: ${Array.from(ALLOWED_ORIGINS).join(", ")}

  🔑 PAIRING TOKEN (paste into Likeway Settings → Companion):
     ${PAIRING_TOKEN}

  Every request must send it as the X-Likeway-Token header.
  Kill switch: POST /api/kill  (or press Ctrl+C)
══════════════════════════════════════════════════════════════════════════
`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n[Companion] Shutting down (SIGINT)...");
  killEverything();
  process.exit(0);
});
process.on("SIGTERM", () => {
  killEverything();
  process.exit(0);
});