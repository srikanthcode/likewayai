export interface BrowserSessionRecord {
  sessionId: string;
  userId: string;
  status: "idle" | "busy" | "closed";
  createdAt: number;
  lastActivityAt: number;
  currentUrl?: string;
  taskId?: string;
  browserInstance?: any;
  contextInstance?: any;
  pageInstance?: any;
}

export class BrowserSessionManager {
  private static instance: BrowserSessionManager;
  private sessions: Map<string, BrowserSessionRecord> = new Map();
  private readonly MAX_CONCURRENT_SESSIONS = 5;
  private readonly SESSION_IDLE_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

  private constructor() {
    // Background idle session cleanup timer
    if (typeof setInterval !== "undefined") {
      setInterval(() => this.cleanupIdleSessions(), 60 * 1000);
    }
  }

  public static getInstance(): BrowserSessionManager {
    if (!BrowserSessionManager.instance) {
      BrowserSessionManager.instance = new BrowserSessionManager();
    }
    return BrowserSessionManager.instance;
  }

  public createSession(userId: string, taskId?: string): BrowserSessionRecord {
    // 1. Enforce concurrent session limit
    if (this.sessions.size >= this.MAX_CONCURRENT_SESSIONS) {
      this.cleanupOldestSession();
    }

    const sessionId = `bs_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const record: BrowserSessionRecord = {
      sessionId,
      userId,
      status: "idle",
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      taskId,
    };

    this.sessions.set(sessionId, record);
    return record;
  }

  public getSession(sessionId: string): BrowserSessionRecord | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivityAt = Date.now();
    }
    return session;
  }

  public updateSession(sessionId: string, updates: Partial<BrowserSessionRecord>): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      Object.assign(session, updates, { lastActivityAt: Date.now() });
    }
  }

  public async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    try {
      if (session.pageInstance) await session.pageInstance.close().catch(() => {});
      if (session.contextInstance) await session.contextInstance.close().catch(() => {});
      if (session.browserInstance) await session.browserInstance.close().catch(() => {});
    } catch (err) {
      console.warn(`[SessionManager] Error closing session ${sessionId}:`, err);
    } finally {
      this.sessions.delete(sessionId);
    }
  }

  public getActiveSessionCount(): number {
    return this.sessions.size;
  }

  public getSessionDiagnostics(): Array<Omit<BrowserSessionRecord, "browserInstance" | "contextInstance" | "pageInstance">> {
    return Array.from(this.sessions.values()).map((s) => ({
      sessionId: s.sessionId,
      userId: s.userId,
      status: s.status,
      createdAt: s.createdAt,
      lastActivityAt: s.lastActivityAt,
      currentUrl: s.currentUrl,
      taskId: s.taskId,
    }));
  }

  private cleanupIdleSessions(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (now - session.lastActivityAt > this.SESSION_IDLE_TIMEOUT_MS) {
        console.log(`[SessionManager] Cleaning up idle browser session: ${id}`);
        this.closeSession(id);
      }
    }
  }

  private cleanupOldestSession(): void {
    let oldestId: string | null = null;
    let oldestTime = Infinity;

    for (const [id, session] of this.sessions.entries()) {
      if (session.lastActivityAt < oldestTime) {
        oldestTime = session.lastActivityAt;
        oldestId = id;
      }
    }

    if (oldestId) {
      console.log(`[SessionManager] Evicting oldest browser session: ${oldestId}`);
      this.closeSession(oldestId);
    }
  }
}
