/**
 * Next.js Instrumentation Hook
 * 
 * Runs once when the server starts. Used for:
 * - MongoDB index creation
 * - Environment validation
 * - Periodic cleanup scheduling
 */

export async function register() {
  // Only run on the server
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initializeApp } = await import("./lib/startup");
    await initializeApp();
  }
}
