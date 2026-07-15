import { NextRequest, NextResponse } from "next/server";
import { getTokenFromCookies, verifyAccessToken } from "@/lib/auth";
import clientPromise, { ObjectId } from "@/lib/mongodb";

// GET /api/user/data — Export all user data (DPDP Act right to access)
export async function GET(req: NextRequest) {
  try {
    const tokens = getTokenFromCookies(req);
    if (!tokens.access) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = verifyAccessToken(tokens.access);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId = payload.sub;
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME || "likeway_ai");

    // Fetch all user data
    const [user, sessions, loginHistory, conversations, usage, projects, personas] = await Promise.all([
      db.collection("users").findOne({ _id: new ObjectId(userId) }, { projection: { passwordHash: 0 } }),
      db.collection("sessions").find({ userId }).toArray(),
      db.collection("login_history").find({ userId }).sort({ createdAt: -1 }).toArray(),
      db.collection("chatmemories").find({ userId }).toArray(),
      db.collection("usage").find({ userId }).toArray(),
      db.collection("projects").find({ userId }).toArray(),
      db.collection("personas").find({ userId }).toArray(),
    ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      dataController: "Aixphonic — LikeWay AI",
      userData: {
        profile: user,
        sessions,
        loginHistory,
        conversations: conversations.map((c: any) => ({
          projectId: c.projectId,
          messageCount: c.messages?.length || 0,
          messages: c.messages,
          updatedAt: c.updatedAt,
        })),
        dailyUsage: usage,
        projects,
        personas,
      },
    };

    return NextResponse.json(exportData, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="likeway-data-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error: any) {
    console.error("[Data Export] Error:", error);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}
