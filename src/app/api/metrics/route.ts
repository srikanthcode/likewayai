import { NextRequest, NextResponse } from "next/server";
import { getMetrics } from "@/lib/performance";
import { getCollectionStats } from "@/lib/indexes";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Basic auth check
  const authHeader = req.headers.get("authorization");
  const metricsKey = process.env.METRICS_API_KEY;
  
  if (metricsKey && authHeader !== `Bearer ${metricsKey}`) {
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
