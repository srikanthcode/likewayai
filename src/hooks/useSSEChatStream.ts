// ══════════════════════════════════════════════════════════════════════
// LIKEWAY AI — SSE CHAT STREAM CONSUMER
// Encapsulates the OpenAI-style streaming protocol used by /api/chat:
//   data: {"choices":[{"delta":{"content":"…"}}]}
//   event: suggestions / data: {"suggestions":[…]}
//   data: [DONE]
// Buffered via SseLineParser so records split across network chunks are
// never dropped.
// ══════════════════════════════════════════════════════════════════════

import { SseLineParser } from "@/lib/sse";

export interface ChatStreamHandlers {
  /** Called with the FULL accumulated content after each delta. */
  onDelta: (fullContent: string) => void;
  /** Called once if the server emitted follow-up suggestion chips. */
  onSuggestions?: (items: string[]) => void;
  /** Called for non-fatal stream read errors (abort/network). */
  onReadError?: (err: unknown) => void;
}

export interface ChatStreamResult {
  fullContent: string;
  sawDone: boolean;
}

/**
 * Consume a chat SSE stream to completion. Never throws for read errors —
 * it records them and resolves with whatever content was received, so the
 * caller can finalize the message normally.
 */
export async function consumeChatStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  handlers: ChatStreamHandlers
): Promise<ChatStreamResult> {
  const decoder = new TextDecoder();
  const parser = new SseLineParser();
  let fullContent = "";
  let sawDone = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      for (const msg of parser.push(decoder.decode(value, { stream: true }))) {
        if (msg.event === "suggestions") {
          try {
            const parsed = JSON.parse(msg.data);
            if (Array.isArray(parsed.suggestions)) handlers.onSuggestions?.(parsed.suggestions);
          } catch {
            // ignore malformed suggestion payloads
          }
          continue;
        }

        const data = msg.data;
        if (data === "[DONE]") {
          sawDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content || "";
          if (delta) {
            fullContent += delta;
            handlers.onDelta(fullContent);
          }
        } catch {
          // ignore partial / non-JSON comments
        }
      }

      if (sawDone) break;
    }
  } catch (readErr) {
    handlers.onReadError?.(readErr);
  }

  return { fullContent, sawDone };
}