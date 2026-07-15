import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { findUserByEmail, updateUser } from "@/lib/auth-models";
import { sendOTPEmail, generateOTP } from "@/lib/email";

// POST: Send password reset OTP
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json({ message: "If an account exists, a reset code has been sent." });
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await updateUser(user._id.toString(), {
      resetToken: otp,
      resetExpires: otpExpires,
    } as any);

    await sendOTPEmail(email, otp, "reset");

    return NextResponse.json({ message: "If an account exists, a reset code has been sent." });
  } catch (error: any) {
    console.error("[Auth] Recovery error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT: Reset password with OTP
export async function PUT(req: NextRequest) {
  try {
    const { email, token, newPassword } = await req.json();
    if (!email || !token || !newPassword) {
      return NextResponse.json({ error: "Email, code, and new password are required" }, { status: 400 });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if ((user as any).resetToken !== token) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    if ((user as any).resetExpires && new Date((user as any).resetExpires) < new Date()) {
      return NextResponse.json({ error: "Verification code has expired. Please request a new one." }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const passwordHash = hashPassword(newPassword);
    await updateUser(user._id.toString(), {
      passwordHash,
      resetToken: null,
      resetExpires: null,
    } as any);

    return NextResponse.json({ message: "Password reset successfully" });
  } catch (error: any) {
    console.error("[Auth] Reset password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
