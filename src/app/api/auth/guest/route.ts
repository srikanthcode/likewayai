import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST() {
  const guestId = "guest_" + crypto.randomBytes(6).toString("hex");
  const guestUser = {
    id: guestId,
    name: "Guest User",
    email: "guest@likeway.in",
    avatar: "",
    role: "guest",
    plan: "Core",
  };

  const response = NextResponse.json({
    success: true,
    user: guestUser,
    redirect: "/",
  });

  const isProd = process.env.NODE_ENV === "production";
  const oneYear = 365 * 24 * 60 * 60; // 1 year

  response.cookies.set("lw_guest", "true", {
    path: "/",
    maxAge: oneYear,
    sameSite: "lax",
    secure: isProd,
    httpOnly: false, // Accessible to client scripts if needed
  });

  response.cookies.set("likeway_guest_mode", "true", {
    path: "/",
    maxAge: oneYear,
    sameSite: "lax",
    secure: isProd,
    httpOnly: false,
  });

  return response;
}

export async function GET() {
  return POST();
}
