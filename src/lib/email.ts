import crypto from "crypto";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM || "Likeway AI <onboarding@resend.dev>";

export async function sendOTPEmail(
  to: string,
  otp: string,
  purpose: "reset" | "verify" = "reset"
): Promise<{ success: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    console.log(`[Email] No RESEND_API_KEY configured. OTP for ${to}: ${otp}`);
    return { success: true };
  }

  const subject =
    purpose === "reset"
      ? "Your Likeway AI Password Reset Code"
      : "Your Likeway AI Verification Code";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0a0e16;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#1a1d27;border-radius:16px;border:1px solid rgba(255,255,255,0.1);overflow:hidden;">
    <div style="padding:32px 24px;text-align:center;">
      <h1 style="color:#e2e2e2;font-size:22px;font-weight:700;margin:0 0 8px;">Likeway AI</h1>
      <p style="color:#908fa0;font-size:13px;margin:0 0 24px;">
        ${purpose === "reset" ? "You requested a password reset." : "Verify your email address."}
      </p>
      <div style="background:#0a0e16;border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:20px;margin:0 0 24px;">
        <p style="color:#908fa0;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px;">Your verification code</p>
        <p style="color:#c0c1ff;font-size:36px;font-weight:800;letter-spacing:8px;margin:0;">${otp}</p>
      </div>
      <p style="color:#908fa0;font-size:12px;margin:0 0 16px;">This code expires in 10 minutes.</p>
      <p style="color:#666;font-size:11px;margin:0;">If you didn't request this, ignore this email.</p>
    </div>
  </div>
</body>
</html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[Email] Resend API error:", err);
      return { success: false, error: err };
    }

    return { success: true };
  } catch (error: any) {
    console.error("[Email] Failed to send:", error.message);
    return { success: false, error: error.message };
  }
}

export function generateOTP(): string {
  return crypto.randomInt(100000, 1000000).toString();
}
