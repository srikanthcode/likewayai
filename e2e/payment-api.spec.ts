import { test, expect } from "@playwright/test";

test.describe("Payment API Routes", () => {
  test("create-order returns error without auth cookie", async ({ request }) => {
    const res = await request.post("/api/create-order", {
      data: { amount: 79900, currency: "INR", receipt: "test" },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test("verify-payment rejects invalid signature", async ({ request }) => {
    const res = await request.post("/api/verify-payment", {
      data: {
        razorpay_order_id: "fake_order",
        razorpay_payment_id: "fake_payment",
        razorpay_signature: "fake_signature",
      },
    });
    const body = await res.json();
    expect(body.error || res.status() >= 400).toBeTruthy();
  });

  test("user/plan returns error without auth", async ({ request }) => {
    const res = await request.get("/api/user/plan");
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});
