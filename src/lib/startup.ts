/**
 * App Startup Initialization
 * 
 * Runs critical setup tasks when the server starts:
 * - MongoDB index creation
 * - Environment validation
 * - Browser Automation Worker startup (Render / Docker / standalone)
 * - WebSocket streaming server startup
 * - Session cleanup
 */

import { ensureIndexes } from "./indexes";
import { validateEnv } from "./env-validate";
import { logger } from "./logger";

let initialized = false;

export async function initializeApp(): Promise<void> {
  if (initialized) return;
  
  const startTime = Date.now();
  logger.info("Starting LikeWay AI initialization...");

  // 1. Validate environment
  const envResult = validateEnv();
  if (!envResult.valid) {
    logger.error("Environment validation failed", { errors: envResult.errors });
    // Don't throw - let app start but log loudly
  }

  // 2. Ensure MongoDB indexes
  try {
    const indexResult = await ensureIndexes();
    logger.info("MongoDB indexes initialized", { 
      created: indexResult.created,
      errors: indexResult.errors.length 
    });
  } catch (error: any) {
    logger.error("Failed to initialize MongoDB indexes", { error: error.message });
  }

  // 3. Initialize WebSocket server for browser automation streaming
  // Only on Render (Docker) - standalone WS server for live browser streaming
  if (process.env.RENDER || process.env.RENDER_EXTERNAL_URL) {
    try {
      const { createStandaloneWSS, getWSS } = await import("./automation/browser-ws-server");
      if (!getWSS()) {
        createStandaloneWSS();
        logger.info("Browser WebSocket server initialized");
      }
    } catch (error: any) {
      logger.warn("WebSocket server initialization skipped", { error: error.message });
    }
  }

  // 4. Initialize Browser Automation Worker
  // Start worker on Render / Docker or in Node.js server environment (not on Vercel serverless functions)
  const isOnVercel = process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview";
  if (!isOnVercel || process.env.RENDER || process.env.RENDER_EXTERNAL_URL) {
    try {
      const { browserWorker } = await import("./automation/browser-worker");
      browserWorker.start();
      logger.info("Browser Automation Worker initialized and running");
    } catch (error: any) {
      logger.warn("Browser Automation Worker initialization skipped", { error: error.message });
    }
  }

  // 5. Schedule periodic cleanup
  scheduleCleanup();

  initialized = true;
  logger.info("LikeWay AI initialized", { duration: `${Date.now() - startTime}ms` });
}

function scheduleCleanup() {
  // Clean up expired sessions every hour
  setInterval(async () => {
    try {
      const { default: clientPromise } = await import("./mongodb");
      const client = await clientPromise;
      const db = client.db(process.env.MONGODB_DB_NAME || "likeway_ai");
      
      // Clean expired rate limit entries
      await db.collection("rate_limits").deleteMany({
        timestamp: { $lt: Date.now() - 300000 } // 5 minutes
      });
      
      // Clean expired blacklisted sessions
      await db.collection("session_blacklist").deleteMany({
        expiresAt: { $lt: new Date() }
      });
      
      logger.debug("Periodic cleanup completed");
    } catch (error: any) {
      logger.error("Cleanup failed", { error: error.message });
    }
  }, 3600000); // Every hour
}

/**
 * Graceful shutdown handler
 */
export function setupGracefulShutdown(server: any) {
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, starting graceful shutdown...`);
    
    // Stop browser worker if running
    try {
      const { browserWorker } = await import("./automation/browser-worker");
      browserWorker.stop();
      logger.info("Browser worker stopped");
    } catch {}

    // Stop accepting new connections
    if (server) {
      server.close(() => {
        logger.info("HTTP server closed");
      });
    }

    // Close MongoDB connection
    try {
      const { default: clientPromise } = await import("./mongodb");
      const client = await clientPromise;
      await client.close();
      logger.info("MongoDB connection closed");
    } catch (error: any) {
      logger.error("Failed to close MongoDB", { error: error.message });
    }

    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  
  // Handle unhandled rejections
  process.on("unhandledRejection", (reason: any) => {
    logger.error("Unhandled rejection", { reason: reason?.message || String(reason) });
  });

  // Handle uncaught exceptions
  process.on("uncaughtException", (error) => {
    logger.fatal("Uncaught exception", { error: error.message, stack: error.stack });
    process.exit(1);
  });
}
