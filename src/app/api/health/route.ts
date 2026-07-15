import { NextResponse } from "next/server";
import { isMongoConfigured } from "@/lib/mongodb";

export async function GET() {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      mongodb: isMongoConfigured() ? "configured" : "not configured",
      environment: process.env.NODE_ENV || "development",
    },
  };

  return NextResponse.json(health);
}