// ══════════════════════════════════════════════════════════════════════
// LIKEWAY AI — PRODUCTION-GRADE LIVE PREVIEW ENGINE
// Session lifecycle, compiler, isolated sandbox runtime & diagnostics
// ══════════════════════════════════════════════════════════════════════

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { repairHtmlDocument } from "./html-repair";

export { repairHtmlDocument };

export type PreviewStatus =
  | "idle"
  | "preparing"
  | "installing"
  | "starting"
  | "ready"
  | "failed"
  | "stopping"
  | "stopped";

export type PreviewRuntime = "html" | "react" | "next" | "node" | "python" | "game";

export interface PreviewLog {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  source: "build" | "runtime" | "console" | "system";
  message: string;
  details?: any;
}

export interface PreviewSession {
  id: string;
  /** Owner of the session. Every read/write of a session must be scoped to it. */
  userId: string;
  projectId: string;
  title: string;
  runtime: PreviewRuntime;
  status: PreviewStatus;
  entryFile: string;
  files: Record<string, string>; // relative path -> content
  previewUrl: string;
  createdAt: string;
  updatedAt: string;
  logs: PreviewLog[];
  error?: string;
  viewport?: "desktop" | "tablet" | "mobile";
  zoom?: number;
}

const PREVIEW_DIR = path.join(process.cwd(), ".previews");

/** Escape text that is interpolated into an HTML document. */
function escapeHtml(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Resolve a session-relative path inside the session's own directory.
 *
 * Generated file names come from an AI model, so they are untrusted input:
 * `../../src/app/...` would otherwise let a preview overwrite application
 * source. Returns null when the path escapes the sandbox.
 */
function resolveInsideSession(sessionId: string, relPath: string): string | null {
  const base = path.resolve(PREVIEW_DIR, sessionId);
  const target = path.resolve(base, relPath);
  const rel = path.relative(base, target);
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return target;
}

// In-memory sessions store (LRU / active cache)
declare global {
  // eslint-disable-next-line no-var
  var _previewSessions: Map<string, PreviewSession> | undefined;
}

if (!global._previewSessions) {
  global._previewSessions = new Map<string, PreviewSession>();
}

const sessions = global._previewSessions;

function ensurePreviewDir(sessionId: string) {
  const dir = path.join(PREVIEW_DIR, sessionId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Detect runtime framework from files or code snippet
 */
export function detectRuntime(
  code: string,
  files?: Record<string, string>,
  title?: string
): PreviewRuntime {
  const codeLower = code.toLowerCase();
  const titleLower = (title || "").toLowerCase();

  if (titleLower.endsWith(".py") || codeLower.startsWith("#!/usr/bin/env python") || codeLower.includes("def main():")) {
    return "python";
  }

  if (
    codeLower.includes("three.js") ||
    codeLower.includes("requestanimationframe") ||
    codeLower.includes("<canvas") ||
    titleLower.includes("game")
  ) {
    return "game";
  }

  if (
    codeLower.includes("import react") ||
    codeLower.includes("export default function") ||
    codeLower.includes("usestate") ||
    codeLower.includes("useeffect") ||
    titleLower.endsWith(".tsx") ||
    titleLower.endsWith(".jsx")
  ) {
    return "react";
  }

  if (files && (files["package.json"]?.includes("next") || files["next.config.js"])) {
    return "next";
  }

  return "html";
}

/**
 * Create or update a preview session
 */
export async function createOrUpdateSession(params: {
  sessionId?: string;
  /** Owner. A session cannot be created or taken over anonymously. */
  userId: string;
  projectId?: string;
  title?: string;
  content: string;
  language?: string;
  files?: Record<string, string>;
}): Promise<PreviewSession> {
  if (!params.userId) {
    throw new Error("A preview session requires an owning user.");
  }
  const sessionId = params.sessionId || crypto.randomBytes(8).toString("hex");
  const projectId = params.projectId || `proj_${crypto.randomBytes(6).toString("hex")}`;
  const title = params.title || "Interactive Application";
  const now = new Date().toISOString();

  const files = params.files || {
    "index.html": params.content,
  };

  const runtime = detectRuntime(params.content, files, title);

  let session = sessions.get(sessionId);

  if (!session) {
    session = {
      id: sessionId,
      userId: params.userId,
      projectId,
      title,
      runtime,
      status: "preparing",
      entryFile: "index.html",
      files,
      previewUrl: `/api/preview/render/${sessionId}`,
      createdAt: now,
      updatedAt: now,
      logs: [],
    };
    sessions.set(sessionId, session);
  } else {
    session.title = title;
    session.runtime = runtime;
    session.files = { ...session.files, ...files };
    session.updatedAt = now;
    session.status = "preparing";
  }

  // Add startup log
  addSessionLog(sessionId, {
    level: "info",
    source: "build",
    message: `Initialized ${runtime.toUpperCase()} preview session [${sessionId}]`,
  });

  // Prepare workspace directory. Every write is confined to the session folder.
  try {
    ensurePreviewDir(sessionId);
    const rejected: string[] = [];
    for (const [relPath, content] of Object.entries(session.files)) {
      const fullPath = resolveInsideSession(sessionId, relPath);
      if (!fullPath) {
        rejected.push(relPath);
        continue;
      }
      const parentDir = path.dirname(fullPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.writeFileSync(fullPath, content, "utf-8");
    }
    if (rejected.length > 0) {
      addSessionLog(sessionId, {
        level: "warn",
        source: "system",
        message: `Ignored ${rejected.length} file path(s) outside the preview sandbox.`,
      });
    }

    session.status = "ready";
    addSessionLog(sessionId, {
      level: "info",
      source: "build",
      message: `Project compiled successfully · Ready to preview`,
    });
  } catch (err: any) {
    session.status = "failed";
    session.error = err.message;
    addSessionLog(sessionId, {
      level: "error",
      source: "build",
      message: `Failed to compile preview files: ${err.message}`,
    });
  }

  return session;
}

export function getSession(sessionId: string): PreviewSession | null {
  return sessions.get(sessionId) || null;
}

export function stopSession(sessionId: string): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;
  session.status = "stopped";
  addSessionLog(sessionId, {
    level: "warn",
    source: "system",
    message: "Preview session stopped by user.",
  });
  return true;
}

export function addSessionLog(
  sessionId: string,
  log: Omit<PreviewLog, "id" | "timestamp">
): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  const newLog: PreviewLog = {
    id: crypto.randomBytes(6).toString("hex"),
    timestamp: new Date().toISOString(),
    ...log,
  };
  session.logs.push(newLog);
  // Cap logs at 150 entries
  if (session.logs.length > 150) {
    session.logs.shift();
  }
}

/**
 * Generate full isolated HTML document for live execution with React 19, Babel, Tailwind CSS, and Error Interceptor
 */
export function buildExecutableBundle(session: PreviewSession): string {
  const mainContent =
    session.files["App.tsx"] ||
    session.files["App.jsx"] ||
    session.files["index.tsx"] ||
    session.files["index.jsx"] ||
    session.files["index.html"] ||
    "";

  const isReact =
    session.runtime === "react" ||
    mainContent.includes("import React") ||
    mainContent.includes("export default function") ||
    mainContent.includes("useState");

  // Telemetry & Error bridge script injected into preview iframe
  const bridgeScript = `
    <script>
      (function() {
        // Intercept all console messages and stream to parent preview canvas
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;

        function emit(level, args) {
          try {
            const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
            window.parent.postMessage({
              type: 'PREVIEW_CONSOLE',
              sessionId: '${session.id}',
              log: {
                level: level,
                source: 'console',
                message: message,
                timestamp: new Date().toISOString()
              }
            }, '*');
          } catch(e) {}
        }

        console.log = function(...args) { originalLog.apply(console, args); emit('info', args); };
        console.warn = function(...args) { originalWarn.apply(console, args); emit('warn', args); };
        console.error = function(...args) { originalError.apply(console, args); emit('error', args); };

        window.onerror = function(msg, url, lineNo, columnNo, error) {
          const errMsg = msg + ' (line ' + lineNo + ':' + columnNo + ')';
          window.parent.postMessage({
            type: 'PREVIEW_ERROR',
            sessionId: '${session.id}',
            error: {
              message: errMsg,
              stack: error ? error.stack : null,
              line: lineNo,
              col: columnNo
            }
          }, '*');
          return false;
        };

        window.addEventListener('unhandledrejection', function(event) {
          window.parent.postMessage({
            type: 'PREVIEW_ERROR',
            sessionId: '${session.id}',
            error: {
              message: 'Unhandled Promise: ' + (event.reason ? (event.reason.message || event.reason) : 'Unknown'),
              stack: event.reason ? event.reason.stack : null
            }
          }, '*');
        });

        // Notify parent iframe ready
        window.addEventListener('load', function() {
          window.parent.postMessage({ type: 'PREVIEW_READY', sessionId: '${session.id}' }, '*');
        });
      })();
    </script>
  `;

  if (isReact) {
    // Clean imports from React snippet for standalone Babel execution
    let reactCode = mainContent
      .replace(/import\s+React\s*,\s*\{([^}]+)\}\s+from\s+['"][^'"]+['"];?/g, "const { $1 } = React;")
      .replace(/import\s+React\s+from\s+['"][^'"]+['"];?/g, "")
      .replace(/import\s+\{([^}]+)\}\s+from\s+['"]react['"];?/g, "const { $1 } = React;")
      .replace(/import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"];?/g, "// lucide icons")
      .replace(/export\s+default\s+function\s+([A-Za-z0-9_]+)/g, "function $1")
      .replace(/export\s+default\s+([A-Za-z0-9_]+);?/g, "");

    // Extract component name or default to App
    const compMatch = mainContent.match(/export\s+default\s+function\s+([A-Za-z0-9_]+)/);
    const componentName = compMatch ? compMatch[1] : "App";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(session.title)}</title>
  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: { 500: '#06B6D4', 600: '#0891B2' }
          }
        }
      }
    };
  </script>
  <!-- React 19 + ReactDOM -->
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <!-- Babel for TSX/JSX Compilation -->
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <!-- Lucide Icons -->
  <script src="https://unpkg.com/lucide@latest"></script>
  ${bridgeScript}
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    #root { width: 100%; min-height: 100vh; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 antialiased">
  <div id="root"></div>

  <script type="text/babel">
    try {
      const { useState, useEffect, useRef, useMemo, useCallback } = React;
      
      ${reactCode}

      const rootElement = document.getElementById('root');
      if (typeof ${componentName} !== 'undefined') {
        const root = ReactDOM.createRoot(rootElement);
        root.render(<${componentName} />);
      } else {
        rootElement.innerHTML = '<div class="p-8 text-center text-rose-400">Component "${componentName}" was not defined in exported code.</div>';
      }
    } catch (err) {
      console.error(err);
      document.getElementById('root').innerHTML = '<div class="p-6 bg-red-950/50 border border-red-500/30 rounded-xl m-4 text-red-300 font-mono text-sm"><strong>Compilation Error:</strong> ' + err.message + '</div>';
    }
  </script>
</body>
</html>`;
  }

  // HTML document or raw snippet: sanitize & repair first
  const repairedHtml = repairHtmlDocument(mainContent, session.title);

  // Inject bridge script and Tailwind CDN into <head>
  if (repairedHtml.includes("<head>")) {
    return repairedHtml.replace("<head>", `<head>\n${bridgeScript}\n<script src="https://cdn.tailwindcss.com"></script>`);
  } else if (repairedHtml.includes("<head ")) {
    return repairedHtml.replace(/<head[^>]*>/i, `$&\n${bridgeScript}\n<script src="https://cdn.tailwindcss.com"></script>`);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(session.title)}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  ${bridgeScript}
</head>
<body>
  ${repairedHtml}
</body>
</html>`;
}
