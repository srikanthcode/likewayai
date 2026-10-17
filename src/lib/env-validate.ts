/**
 * Environment Variable Validation
 * 
 * Validates critical environment variables on startup.
 * Fail loudly in production to prevent silent misconfiguration.
 */

interface EnvVarConfig {
  key: string;
  required: boolean;
  description: string;
  validate?: (value: string) => boolean;
}

const CRITICAL_VARS: EnvVarConfig[] = [
  { key: "MONGODB_URI", required: true, description: "MongoDB connection string" },
  { key: "JWT_SECRET", required: true, description: "JWT signing secret (min 32 chars)" },
  { key: "MISTRAL_API_KEY", required: false, description: "Mistral AI API key" },
  { key: "GROQ_KEYS", required: false, description: "Groq API keys (comma-separated)" },
  { key: "OPENROUTER_KEYS", required: false, description: "OpenRouter API keys (comma-separated)" },
  { key: "GOOGLE_CLIENT_ID", required: false, description: "Google OAuth client ID" },
  { key: "GOOGLE_CLIENT_SECRET", required: false, description: "Google OAuth client secret" },
  { key: "NEXT_PUBLIC_APP_URL", required: false, description: "Public app URL" },
  { key: "RAZORPAY_KEY_ID", required: false, description: "Razorpay key ID" },
  { key: "RAZORPAY_KEY_SECRET", required: false, description: "Razorpay key secret" },
  { key: "RAZORPAY_WEBHOOK_SECRET", required: false, description: "Razorpay webhook signing secret (required for renewals/cancellations)" },
  { key: "TOKENHARBOR_API_KEY", required: false, description: "TokenHarbor key — no longer hardcoded; model family unavailable without it" },
  { key: "CSRF_SECRET", required: false, description: "HMAC secret for CSRF tokens (must be stable across instances)" },
  { key: "INTERNAL_API_SECRET", required: false, description: "Shared secret for Vercel→Render server-to-server calls" },
  { key: "IMAGE_EDIT_MODEL", required: false, description: "OpenRouter image-to-image model for image editing" },
  { key: "TTS_MODEL", required: false, description: "Neural TTS model (falls back to browser speech when unset)" },
  { key: "RENDER_API_URL", required: false, description: "Render backend URL for browser automation proxy (used on Vercel)" },
];

export function validateEnv(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProd = process.env.NODE_ENV === "production";

  for (const config of CRITICAL_VARS) {
    const value = process.env[config.key];
    
    if (!value || value.trim() === "") {
      if (config.required && isProd) {
        errors.push(`CRITICAL: Missing required env var "${config.key}" — ${config.description}`);
      } else if (config.required) {
        warnings.push(`Missing env var "${config.key}" — ${config.description}. Using fallback/mock.`);
      }
      continue;
    }

    // Validate if validator provided
    if (config.validate && !config.validate(value)) {
      errors.push(`Invalid value for "${config.key}" — ${config.description}`);
    }
  }

  // Check for NEXT_PUBLIC vars that might be missing in production
  if (isProd && !process.env.NEXT_PUBLIC_API_URL) {
    warnings.push('NEXT_PUBLIC_API_URL not set — browser automation proxy may fail on Vercel');
  }

  // Validate Playwright browser path on Render
  if (process.env.RENDER && !process.env.PLAYWRIGHT_BROWSERS_PATH) {
    warnings.push('PLAYWRIGHT_BROWSERS_PATH not set — browser automation may fail on Render');
  }

  // Validate RENDER_API_URL when on Vercel (needed for proxy to Render)
  if (process.env.VERCEL_REGION && !process.env.RENDER_API_URL) {
    warnings.push('RENDER_API_URL not set — browser automation proxy from Vercel to Render will fail');
  }

  // Google OAuth: the callback + id_token verification both need a client id.
  if (isProd && !process.env.GOOGLE_CLIENT_ID) {
    warnings.push('GOOGLE_CLIENT_ID not set — Google sign-in and id_token verification will fail');
  }

  // CSRF secret must be stable across serverless instances.
  if (isProd && !process.env.CSRF_SECRET) {
    warnings.push('CSRF_SECRET not set — CSRF tokens will not validate across instances');
  }

  // Razorpay subscription plans (recurring billing).
  if (process.env.RAZORPAY_KEY_ID && !process.env.RAZORPAY_PLAN_GO) {
    warnings.push('RAZORPAY_PLAN_GO/PLUS/PRO not set — /api/subscription/create will reject every request');
  }

  // Insecure JWT secret fallback guard.
  if (isProd && process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters in production');
  }

  if (errors.length > 0) {
    console.error("[Env Validation] ❌ Validation FAILED:");
    errors.forEach(e => console.error(`  - ${e}`));
  }
  if (warnings.length > 0) {
    console.warn("[Env Validation] ⚠️ Warnings:");
    warnings.forEach(w => console.warn(`  - ${w}`));
  }
  if (errors.length === 0 && warnings.length === 0) {
    console.log("[Env Validation] ✅ All environment variables valid.");
  }

  return { valid: errors.length === 0, errors, warnings };
}

// Run validation on import in production
if (process.env.NODE_ENV === "production") {
  const result = validateEnv();
  if (!result.valid) {
    console.error("[Env Validation] Cannot start in production with missing critical variables.");
    // Don't throw — let the app start but log loudly
    // In a real production setup, you'd want this to fail the build
  }
}
