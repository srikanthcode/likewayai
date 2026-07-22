// screencast-manager.ts
// Streams a live view of a Playwright page using Chrome DevTools Protocol (CDP)
// screencasting. This is how Comet / Browserbase-style "watch the agent work"
// UIs are built — you can't show a real OS window from a server, so instead
// you continuously grab JPEG frames straight from Chrome and push them to
// the frontend.

import type { Page } from "playwright";

export type FrameListener = (frame: { data: string; timestamp: number; metadata: any }) => void;

export interface ScreencastSession {
  stop: () => Promise<void>;
}

export async function startScreencast(
  page: Page,
  onFrame: FrameListener,
  opts: {
    format?: "jpeg" | "png";
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
    everyNthFrame?: number;
  } = {}
): Promise<ScreencastSession> {
  const client = await page.context().newCDPSession(page);

  const {
    format = "jpeg",
    quality = 60,      // lower = less bandwidth, still reads as "live"
    maxWidth = 960,
    maxHeight = 600,
    everyNthFrame = 1, // Chrome self-throttles based on how fast you ack
  } = opts;

  const handler = async (frame: any) => {
    onFrame({ data: frame.data, timestamp: frame.metadata?.timestamp, metadata: frame.metadata });
    // You MUST ack every frame or Chrome stops sending new ones after a few.
    try {
      await client.send("Page.screencastFrameAck", { sessionId: frame.sessionId });
    } catch {}
  };

  client.on("Page.screencastFrame", handler);
  await client.send("Page.startScreencast", { format, quality, maxWidth, maxHeight, everyNthFrame });

  return {
    stop: async () => {
      try { await client.send("Page.stopScreencast"); } catch {}
      try { client.off("Page.screencastFrame", handler); } catch {}
      try { await client.detach(); } catch {}
    },
  };
}
