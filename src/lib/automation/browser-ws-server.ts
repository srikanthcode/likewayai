/**
 * LikeWay Browser WebSocket Server
 *
 * Provides live streaming of browser automation sessions to frontend clients.
 * Clients connect with a sessionId and receive:
 *   - status:  launching / ready / done / error
 *   - frame:   base64 JPEG from the CDP screencast (the "live" picture)
 *   - step:    narration for each agent action
 *
 * Architecture:
 *   - In Next.js (Vercel/Render): The WebSocket server is started via
 *     instrumentation.ts → startup.ts → createStandaloneWSS()
 *   - It creates its own HTTP server on a configurable port (default 10001)
 *   - The main Next.js server proxies /browser-stream to this WS server
 *
 * Production note: On Render, the Docker container runs both the Next.js
 * server (port 10000) and the WebSocket server (port 10001). The frontend
 * connects to wss://likewayai.onrender.com:10001/browser-stream?sessionId=...
 */

import { WebSocketServer, WebSocket } from "ws";
import http from "http";

const sessions = new Map<string, Set<WebSocket>>();
let _wss: WebSocketServer | null = null;
let _httpServer: http.Server | null = null;

/**
 * Create a WebSocket server attached to an existing HTTP server
 * (used when Next.js provides its own server)
 */
export function createBrowserStreamServer(server: http.Server) {
  const wss = new WebSocketServer({ server, path: "/browser-stream" });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url || "", "http://localhost");
    const sessionId = url.searchParams.get("sessionId");
    if (!sessionId) {
      ws.close(1008, "sessionId required");
      return;
    }

    if (!sessions.has(sessionId)) sessions.set(sessionId, new Set());
    sessions.get(sessionId)!.add(ws);

    ws.send(JSON.stringify({ type: "connected", sessionId }));

    ws.on("close", () => {
      sessions.get(sessionId)?.delete(ws);
      if (sessions.get(sessionId)?.size === 0) sessions.delete(sessionId);
    });
  });

  _wss = wss;
  return wss;
}

/**
 * Create a standalone WebSocket server on its own port.
 * This is used when running on Render (Docker) where we need
 * a separate WS server alongside the Next.js HTTP server.
 *
 * @param port - Port to listen on (default: 10001)
 * @returns The WebSocketServer instance
 */
export function createStandaloneWSS(port: number = 10001): WebSocketServer {
  if (_wss) {
    console.log(`[WS Server] Already running on port ${port}`);
    return _wss;
  }

  const server = http.createServer((_req, res) => {
    // Health check endpoint for the WS server
    if (_req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        status: "ok",
        sessions: sessions.size,
        uptime: process.uptime(),
      }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  const wss = new WebSocketServer({ server, path: "/browser-stream" });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url || "", "http://localhost");
    const sessionId = url.searchParams.get("sessionId");
    if (!sessionId) {
      ws.close(1008, "sessionId required");
      return;
    }

    if (!sessions.has(sessionId)) sessions.set(sessionId, new Set());
    sessions.get(sessionId)!.add(ws);

    ws.send(JSON.stringify({ type: "connected", sessionId }));

    ws.on("close", () => {
      sessions.get(sessionId)?.delete(ws);
      if (sessions.get(sessionId)?.size === 0) sessions.delete(sessionId);
    });
  });

  server.listen(port, () => {
    console.log(`[WS Server] WebSocket server listening on port ${port}`);
  });

  _wss = wss;
  _httpServer = server;

  // Graceful shutdown
  const shutdown = () => {
    console.log("[WS Server] Shutting down...");
    wss.close(() => {
      server.close();
    });
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  return wss;
}

/**
 * Get the current WebSocket server instance (if running)
 */
export function getWSS(): WebSocketServer | null {
  return _wss;
}

/**
 * Get the current HTTP server instance (if running)
 */
export function getWSSHttpServer(): http.Server | null {
  return _httpServer;
}

function broadcast(sessionId: string, payload: object) {
  const clients = sessions.get(sessionId);
  if (!clients || clients.size === 0) return;
  const msg = JSON.stringify(payload);
  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) ws.send(msg);
  }
}

export function broadcastFrame(sessionId: string, jpegBase64: string) {
  broadcast(sessionId, { type: "frame", data: jpegBase64, ts: Date.now() });
}

export function broadcastStep(sessionId: string, step: {
  iteration: number;
  action: string;
  reasoning: string;
  url: string;
  phase: string;
  success: boolean;
}) {
  broadcast(sessionId, { type: "step", ...step });
}

export function broadcastStatus(
  sessionId: string,
  status: "launching" | "ready" | "done" | "error",
  detail?: string
) {
  broadcast(sessionId, { type: "status", status, detail });
}
