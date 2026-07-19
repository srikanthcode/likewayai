import { NextResponse } from "next/server";
import { isMongoConfigured } from "@/lib/mongodb";

export async function GET() {
  const checkKey = (val: string | undefined) => {
    if (!val || val.trim() === "") return "MISSING";
    return "SET";
  };

  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      mongodb: isMongoConfigured() ? "configured" : "not configured",
      environment: process.env.NODE_ENV || "development",
    },
    apiKeys: {
      MISTRAL_API_KEY: checkKey(process.env.MISTRAL_API_KEY),
      GROQ_KEYS: checkKey(process.env.GROQ_KEYS),
      OPENROUTER_KEYS: checkKey(process.env.OPENROUTER_KEYS),
      JWT_SECRET: checkKey(process.env.JWT_SECRET),
      MONGODB_URI: checkKey(process.env.MONGODB_URI),
      NEXT_PUBLIC_APP_URL: checkKey(process.env.NEXT_PUBLIC_APP_URL),
    },
  };

  return NextResponse.json(health);
}
