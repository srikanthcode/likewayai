import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { findUserByEmail, updateUser } from "@/lib/auth-models";
import { sendOTPEmail } from "@/lib/email";
import { createPasswordReset, verifyPasswordReset, clearPasswordReset } from "@/lib/otp";
import { checkRateLimit } from "@/lib/rate-limit";

// Generic response for BOTH existing and unknown emails — prevents account
// enumeration and never leaks a code back to the client.
const GENERIC_MESSAGE =
  "If an account exists for that email, a verification code has been sent.";

// POST: Send password reset OTP (existing accounts only)
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json().catch(() => ({}));
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Throttle per email to blunt brute-force / mail-bombing.
    const rl = checkRateLimit(`recovery:${normalizedEmail}`, { windowMs: 60000, maxRequests: 3 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again in a minute." }, { status: 429 });
    }

    const user = await findUserByEmail(normalizedEmail);

    // Never create a user here. Only send a code to a real account.
    if (user && user._id) {
      try {
        const otp = await createPasswordReset(normalizedEmail);
        await sendOTPEmail(normalizedEmail, otp, "reset");
      } catch (err: any) {
        console.error("[Auth] Failed to issue reset code:", err?.message || err);
      }
    }

    return NextResponse.json({ message: GENERIC_MESSAGE });
  } catch (error: any) {
    console.error("[Auth] Recovery error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT: Reset password with OTP
export async function PUT(req: NextRequest) {
  try {
    const { email, token, newPassword } = await req.json().catch(() => ({}));
    if (!email || !token || !newPassword) {
      return NextResponse.json({ error: "Email, code, and new password are required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long." }, { status: 400 });
    }

    // The account must already exist — no implicit creation.
    const user = await findUserByEmail(normalizedEmail);
    if (!user || !user._id) {
      return NextResponse.json({ error: "Invalid or expired verification code." }, { status: 400 });
    }

    const valid = await verifyPasswordReset(normalizedEmail, String(token));
    if (!valid) {
      return NextResponse.json({ error: "Invalid or expired verification code." }, { status: 400 });
    }

    const passwordHash = hashPassword(newPassword);
    await updateUser(user._id.toString(), { passwordHash } as any);

    // Consume the code so it cannot be replayed.
    await clearPasswordReset(normalizedEmail);

    return NextResponse.json({
      success: true,
      message: "Password reset successfully! You can now log in with your new password.",
    });
  } catch (error: any) {
    console.error("[Auth] Reset password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}