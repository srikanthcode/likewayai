import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, getTokenFromCookies } from "@/lib/auth";
import { findUserById, updateUser } from "@/lib/auth-models";
import { normalizePlan } from "@/lib/plans";

// ── GET /api/auth/me ──────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const tokens = getTokenFromCookies(req);
    if (!tokens.access) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const payload = verifyAccessToken(tokens.access);
    if (!payload) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const user = await findUserById(payload.sub);
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        plan: normalizePlan(user.plan),
        provider: user.provider,
        emailVerified: user.emailVerified,
        onboardingCompleted: user.onboardingCompleted,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (error: any) {
    console.error("[Auth/me GET]", error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}

// ── PUT /api/auth/me  (profile update) ────────────────────────────────────
export async function PUT(req: NextRequest) {
  try {
    const tokens = getTokenFromCookies(req);
    if (!tokens.access) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyAccessToken(tokens.access);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Whitelist updatable fields
    const ALLOWED = [
      "name", "avatar", "onboardingCompleted",
      "onboardingGoal", "onboardingExperience",
      "age", "referralSource",
    ] as const;

    const updates: Record<string, any> = {};
    for (const field of ALLOWED) {
      if (body[field] !== undefined) updates[field] = body[field];
    }

    if (Object.keys(updates).length > 0) {
      await updateUser(payload.sub, updates as any);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Auth/me PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
