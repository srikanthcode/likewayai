import { NextRequest, NextResponse } from "next/server";
import { getTokenFromCookies, verifyAccessToken } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "likeway_ai";

async function getDb() {
  const client = await clientPromise;
  return client.db(MONGODB_DB_NAME);
}

function getUserEmail(req: NextRequest): string | null {
  const tokens = getTokenFromCookies(req);
  if (!tokens.access) return null;
  const payload = verifyAccessToken(tokens.access);
  return (payload?.email as string) || null;
}

export async function GET(req: NextRequest) {
  try {
    const email = getUserEmail(req);
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const user = await db.collection("users").findOne({ email });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const keys = user.apiKeys || {};
    return NextResponse.json({ keys });
  } catch (error: any) {
    console.error("Error fetching API keys:", error);
    return NextResponse.json({ error: "Failed to fetch API keys" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const email = getUserEmail(req);
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { provider, key } = await req.json();

    if (!provider || !key) {
      return NextResponse.json({ error: "Provider and key are required" }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection("users").updateOne(
      { email },
      { $set: { [`apiKeys.${provider}`]: key } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error saving API key:", error);
    return NextResponse.json({ error: "Failed to save API key" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const email = getUserEmail(req);
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { provider } = await req.json();

    if (!provider) {
      return NextResponse.json({ error: "Provider is required" }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection("users").updateOne(
      { email },
      { $unset: { [`apiKeys.${provider}`]: "" } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting API key:", error);
    return NextResponse.json({ error: "Failed to delete API key" }, { status: 500 });
  }
}
