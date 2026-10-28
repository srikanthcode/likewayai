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

  // Guest mode is a UI preference, not an identity: the guest id above is
  // never trusted by the API. Cookies stay httpOnly so page scripts cannot
  // forge a guest session, and are never used to grant quota or access.
  response.cookies.set("lw_guest", "true", {
    path: "/",
    maxAge: oneYear,
    sameSite: "lax",
    secure: isProd,
    httpOnly: true,
  });

  response.cookies.set("likeway_guest_mode", "true", {
    path: "/",
    maxAge: oneYear,
    sameSite: "lax",
    secure: isProd,
    httpOnly: true,
  });

  return response;
}

export async function GET() {
  return POST();
}
