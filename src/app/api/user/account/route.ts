import { NextRequest, NextResponse } from "next/server";
import { getTokenFromCookies, verifyAccessToken } from "@/lib/auth";
import clientPromise, { ObjectId } from "@/lib/mongodb";

// DELETE /api/user/account — Delete user account and all associated data
export async function DELETE(req: NextRequest) {
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

    // Delete user data across all collections
    const results = await Promise.all([
      db.collection("users").deleteOne({ _id: new ObjectId(userId) }),
      db.collection("sessions").deleteMany({ userId }),
      db.collection("login_history").deleteMany({ userId }),
      db.collection("chatmemories").deleteMany({ userId }),
      db.collection("usage").deleteMany({ userId }),
      db.collection("rate_limits").deleteMany({ userId }),
      db.collection("projects").deleteMany({ userId }),
      db.collection("personas").deleteMany({ userId }),
    ]);

    const totalDeleted = results.reduce((sum: number, r: { deletedCount?: number }) => sum + (r.deletedCount || 0), 0);

    // Clear auth cookies
    const response = NextResponse.json({
      message: "Account and all associated data deleted successfully.",
      deletedDocuments: totalDeleted,
    });

    const cookieOpts = { httpOnly: true, path: "/", maxAge: 0 };
    response.cookies.set("lw_at", "", cookieOpts);
    response.cookies.set("lw_rt", "", cookieOpts);
    response.cookies.set("likeway_access_token", "", cookieOpts);
    response.cookies.set("likeway_refresh_token", "", cookieOpts);

    return response;
  } catch (error: any) {
    console.error("[Account Delete] Error:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
