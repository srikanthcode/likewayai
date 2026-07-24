import { NextRequest, NextResponse } from "next/server";
import { getRazorpay } from "@/lib/razorpay";
import { getTokenFromCookies, verifyAccessToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const tokens = getTokenFromCookies(req);
    if (!tokens.access) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const payload = verifyAccessToken(tokens.access);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { amount, currency = "INR", receipt } = await req.json();

    if (!amount || amount < 100) {
      return NextResponse.json({ error: "Invalid amount. Minimum amount is 100 paise (₹1)" }, { status: 400 });
    }

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret || razorpayKeyId === "rzp_test_your_id") {
      return NextResponse.json({
        error: "Razorpay credentials not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to environment variables."
      }, { status: 500 });
    }

    const razorpay = getRazorpay();
    if (!razorpay) {
      return NextResponse.json({ error: "Razorpay is not configured" }, { status: 500 });
    }

    // Razorpay receipt max 40 chars — truncate to avoid 400 error
    const shortReceipt = (receipt || `r_${Date.now()}`).slice(0, 40);

    const options = {
      amount: amount,
      currency: "INR",
      receipt: shortReceipt,
      notes: {
        country: "IN",
      },
    };

    const order = await razorpay.orders.create(options);

    if (!order) {
      throw new Error("Razorpay API returned undefined response");
    }

    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: razorpayKeyId,
    });
  } catch (error: any) {
    console.error("Order Creation Error:", error);

    if (error.statusCode === 401) {
      return NextResponse.json({ error: "Authentication failed. Check your Razorpay credentials." }, { status: 401 });
    }

    const errorMessage = error.error?.description || error.message || "Failed to create order";
    return NextResponse.json({
      error: errorMessage,
      details: error.error || null
    }, { status: 500 });
  }
}
