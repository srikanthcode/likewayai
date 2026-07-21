import { NextRequest, NextResponse } from "next/server";
import { getUserPreferences, updateUserPreferences } from "@/lib/memory";
import { getTokenFromCookies, verifyAccessToken } from "@/lib/auth";
import { logger, generateRequestId } from "@/lib/logger";

export const dynamic = "force-dynamic";

// GET /api/user/preferences — Get user preferences
export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  
  try {
    const tokens = getTokenFromCookies(req);
    if (!tokens.access) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyAccessToken(tokens.access);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId = payload.sub;
    const preferences = await getUserPreferences(userId);

    return NextResponse.json({
      success: true,
      preferences,
    });

  } catch (error: any) {
    logger.error("Failed to get preferences", { requestId, error: error.message });
    return NextResponse.json(
      { success: false, error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}

// PUT /api/user/preferences — Update user preferences
export async function PUT(req: NextRequest) {
  const requestId = generateRequestId();
  
  try {
    const tokens = getTokenFromCookies(req);
    if (!tokens.access) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyAccessToken(tokens.access);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId = payload.sub;
    const body = await req.json();

    // Validate and sanitize input
    const allowedFields = ["language", "tone", "codeStyle", "favoriteModels", "favoriteModes", "customInstructions"];
    const updates: Record<string, any> = {};
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    await updateUserPreferences(userId, updates);

    logger.info("Preferences updated", { requestId, userId, fields: Object.keys(updates) });

    return NextResponse.json({
      success: true,
      message: "Preferences updated",
      updatedFields: Object.keys(updates),
    });

  } catch (error: any) {
    logger.error("Failed to update preferences", { requestId, error: error.message });
    return NextResponse.json(
      { success: false, error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}
