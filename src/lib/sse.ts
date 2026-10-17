// ══════════════════════════════════════════════════════════════════════
// LIKEWAY AI — SERVER-SENT EVENTS (SSE) LINE PARSER
// Buffers partial lines across network chunks so a record split between
// two chunks is never dropped (a bug present in the hand-rolled loops).
// Understands `event:` and `data:` fields, ignores comments/id/retry.
// ══════════════════════════════════════════════════════════════════════

export interface SseMessage {
  event: string;
  data: string;
}

export class SseLineParser {
  private buffer = "";
  private event = "message";

  /** Feed a decoded chunk; returns any complete messages it completed. */
  push(chunk: string): SseMessage[] {
    const out: SseMessage[] = [];
    this.buffer += chunk;

    let idx: number;
    while ((idx = this.buffer.indexOf("\n")) !== -1) {
      const rawLine = this.buffer.slice(0, idx);
      this.buffer = this.buffer.slice(idx + 1);
      const line = rawLine.replace(/\r$/, "");

      if (line === "") {
        // Blank line terminates an event record.
        this.event = "message";
        continue;
      }
      if (line.startsWith(":")) continue; // comment / keep-alive
      if (line.startsWith("event:")) {
        this.event = line.slice(6).trim();
        continue;
      }
      if (line.startsWith("data:")) {
        out.push({ event: this.event, data: line.slice(5).replace(/^ /, "") });
        continue;
      }
      // id: / retry: fields are not used by the Likeway stream.
    }

    return out;
  }

  /** Flush any trailing buffered line at end of stream. */
  flush(): SseMessage[] {
    if (!this.buffer) return [];
    const line = this.buffer.replace(/\r$/, "");
    this.buffer = "";
    if (line.startsWith("data:")) {
      return [{ event: this.event, data: line.slice(5).replace(/^ /, "") }];
    }
    return [];
  }

  reset(): void {
    this.buffer = "";
    this.event = "message";
  }
}