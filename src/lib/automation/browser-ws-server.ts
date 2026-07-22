// browser-ws-server.ts
// Runs on your Render service (where Playwright actually launches Chrome).
// Frontend clients connect with a sessionId and receive:
//   - status:  launching / ready / done / error
//   - frame:   base64 JPEG from the CDP screencast (the "live" picture)
//   - step:    narration for each agent action (like Comet's "doing X now")
//
// npm install ws

import { WebSocketServer, WebSocket } from "ws";
import http from "http";

const sessions = new Map<string, Set<WebSocket>>();

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

  return wss;
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
