import { NextRequest, NextResponse } from "next/server";
import { getUserPlan } from "@/lib/user";
import { verifyAccessToken, getTokenFromCookies } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { access } = getTokenFromCookies(req);
    if (!access) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const payload = verifyAccessToken(access);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId = payload.sub;
    const userSub = await getUserPlan(userId);

    return NextResponse.json(userSub);
  } catch (error: any) {
    console.error("Fetch User Plan Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return NextResponse.json({ error: "Direct plan upgrades are not allowed" }, { status: 403 });
}
