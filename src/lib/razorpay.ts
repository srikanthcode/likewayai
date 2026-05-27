import Razorpay from "razorpay";

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn("RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not set in environment variables.");
}

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

export const createRazorpayPlan = async (name: string, amount: number, description: string) => {
  try {
    const plan = await razorpay.plans.create({
      period: "monthly",
      interval: 1,
      item: {
        name,
        amount: amount * 100, // Razorpay expects amount in paise
        currency: "INR",
        description,
      },
    });
    return plan;
  } catch (error) {
    console.error("Error creating Razorpay plan:", error);
    throw error;
  }
};

export const createRazorpaySubscription = async (planId: string, notes: Record<string, string> = {}, customerNotify: boolean = true) => {
  try {
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_notify: customerNotify ? 1 : 0,
      total_count: 120, // 10 years for a monthly subscription
      notes: notes
    });
    return subscription;
  } catch (error) {
    console.error("Error creating Razorpay subscription:", error);
    throw error;
  }
};
