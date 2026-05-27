import { NextRequest, NextResponse } from "next/server";
import { getUserPlan } from "@/lib/user";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const userSub = await getUserPlan(userId);

    return NextResponse.json(userSub);
  } catch (error: any) {
    console.error("Fetch User Plan Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, plan } = await req.json();

    if (!userId || !plan) {
      return NextResponse.json({ error: "Missing userId or plan" }, { status: 400 });
    }

    const { updateUserSubscription } = await import("@/lib/user");
    await updateUserSubscription(userId, plan, "active", "sub_direct_upgrade_" + Math.random().toString(36).substring(2, 11));

    return NextResponse.json({ success: true, plan });
  } catch (error: any) {
    console.error("Update User Plan Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
