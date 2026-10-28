import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getMetrics } from "@/lib/performance";
import { getCollectionStats } from "@/lib/indexes";

export const dynamic = "force-dynamic";

/** Constant-time bearer comparison. */
function bearerMatches(header: string | null, expected: string): boolean {
  const provided = header?.startsWith("Bearer ") ? header.slice(7) : "";
  if (!provided || provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

export async function GET(req: NextRequest) {
  const metricsKey = process.env.METRICS_API_KEY;

  // Fail CLOSED: with no key configured the endpoint is disabled rather than
  // public. Metrics disclose traffic, error and cost information.
  if (!metricsKey) {
    return NextResponse.json(
      { error: "Metrics endpoint is not configured" },
      { status: 503 }
    );
  }

  if (!bearerMatches(req.headers.get("authorization"), metricsKey)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const performanceMetrics = getMetrics();
    
    // Get database stats if available
    let dbStats = {};
    try {
      dbStats = await getCollectionStats();
    } catch {
      dbStats = { error: "Unable to fetch" };
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      performance: performanceMetrics,
      database: dbStats,
      memory: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
      node: process.version,
      platform: process.env.VERCEL ? "vercel" : process.env.RENDER ? "render" : "local",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
