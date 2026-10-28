import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requireIdentity, unauthorizedResponse } from "@/lib/request-auth";
import { getPaymentRef } from "@/lib/payments-store";

function timingSafeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function POST(req: NextRequest) {
  try {
    // Verification reveals whether a payment id is genuine, so it is
    // authenticated and scoped to the caller's own orders.
    const identity = requireIdentity(req);
    if (!identity) return unauthorizedResponse();

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({
        error: "Missing required fields: razorpay_order_id, razorpay_payment_id, or razorpay_signature"
      }, { status: 400 });
    }

    const ref = await getPaymentRef(razorpay_order_id);
    if (!ref || (ref.userId !== identity.userId && !identity.internal)) {
      return NextResponse.json({ error: "Unknown order" }, { status: 404 });
    }

    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeySecret || razorpayKeySecret === "") {
      return NextResponse.json({ 
        error: "Razorpay key secret not configured" 
      }, { status: 500 });
    }

    // One canonical signature shape. Accepting the reversed concatenation as
    // well would validate a digest Razorpay never produces.
    const expectedSig = crypto
      .createHmac("sha256", razorpayKeySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const isMatch = timingSafeEqual(expectedSig, razorpay_signature);

    if (!isMatch) {
      console.error("[Payment Verify] Signature mismatch");
      return NextResponse.json({ 
        error: "Invalid payment signature. Verification failed." 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      status: "success", 
      message: "Payment verified successfully",
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id
    });
  } catch (error: any) {
    console.error("Payment Verification Error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to verify payment" 
    }, { status: 500 });
  }
}
