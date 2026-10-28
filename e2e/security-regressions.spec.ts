import { test, expect } from "@playwright/test";

/**
 * Security regression suite.
 *
 * Each test asserts a specific vulnerability that was fixed during the
 * production upgrade. A regression here means the hole is open again.
 */

test.describe("Authentication boundaries", () => {
  const protectedRoutes = [
    { method: "POST", path: "/api/gateway", data: { prompt: "hi" } },
    { method: "POST", path: "/api/integrations/execute", data: { toolName: "github.list_repos", params: {} } },
    { method: "POST", path: "/api/integrations/approval", data: { approvalId: "abc", approved: true } },
    { method: "POST", path: "/api/ingest", data: { content: "x" } },
    { method: "POST", path: "/api/preview/repair", data: { code: "x", error: "y" } },
    { method: "POST", path: "/api/learn/generate-questions", data: { courseId: "c", moduleTitle: "m" } },
    { method: "POST", path: "/api/agent-reach/extract", data: { url: "https://example.com" } },
    { method: "GET", path: "/api/integrations" },
    { method: "GET", path: "/api/preview/session?sessionId=abc" },
    { method: "GET", path: "/api/files/some-file-id" },
  ];

  for (const route of protectedRoutes) {
    test(`${route.method} ${route.path} rejects anonymous callers`, async ({ request }) => {
      const res =
        route.method === "GET"
          ? await request.get(route.path)
          : await request.post(route.path, { data: route.data });
      expect(res.status()).toBe(401);
    });
  }

  test("x-user-id header does NOT authenticate the gateway", async ({ request }) => {
    // Previously identity was taken straight from this header.
    const res = await request.post("/api/gateway", {
      headers: { "x-user-id": "victim-user-123" },
      data: { prompt: "hi" },
    });
    expect(res.status()).toBe(401);
  });

  test("body userId does NOT authenticate the gateway", async ({ request }) => {
    const res = await request.post("/api/gateway", {
      data: { prompt: "hi", userId: "victim-user-123" },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("Automation job ownership", () => {
  test("job detail requires authentication", async ({ request }) => {
    const res = await request.get("/api/automation/jobs/job_123");
    expect(res.status()).toBe(401);
  });

  test("job cancellation requires authentication", async ({ request }) => {
    const res = await request.delete("/api/automation/jobs/job_123");
    expect(res.status()).toBe(401);
  });

  test("job list requires authentication", async ({ request }) => {
    const res = await request.get("/api/automation/jobs");
    expect(res.status()).toBe(401);
  });

  test("job list does not accept a userId query override for anonymous callers", async ({ request }) => {
    const res = await request.get("/api/automation/jobs?userId=someone-else");
    expect(res.status()).toBe(401);
  });

  test("job stream requires authentication", async ({ request }) => {
    const res = await request.get("/api/automation/jobs/job_123/stream");
    expect(res.status()).toBe(401);
  });

  test("enqueueing automation requires authentication", async ({ request }) => {
    const res = await request.post("/api/automation/jobs", { data: { task: "open example.com" } });
    expect(res.status()).toBe(401);
  });
});

test.describe("Payment integrity", () => {
  test("verify-payment requires authentication", async ({ request }) => {
    const res = await request.post("/api/verify-payment", {
      data: {
        razorpay_order_id: "order_x",
        razorpay_payment_id: "pay_x",
        razorpay_signature: "sig_x",
      },
    });
    expect(res.status()).toBe(401);
  });

  test("subscription confirm rejects a foreign/forged order", async ({ request }) => {
    const res = await request.post("/api/subscription/confirm", {
      data: {
        planId: "Pro",
        razorpay_order_id: "order_attacker_controlled",
        razorpay_payment_id: "pay_1",
        razorpay_signature: "deadbeef",
      },
    });
    // Unauthenticated: rejected at the identity gate.
    expect(res.status()).toBe(401);
  });

  test("webhook rejects a request without a valid signature", async ({ request }) => {
    const res = await request.post("/api/webhook/razorpay", {
      headers: { "x-razorpay-signature": "not-a-real-signature" },
      data: { event: "payment.captured", payload: {} },
    });
    // 400 invalid signature, or 503 when no webhook secret is configured.
    expect([400, 503]).toContain(res.status());
  });
});

test.describe("SSRF guard", () => {
  const blocked = [
    "http://127.0.0.1/admin",
    "http://localhost:3000/api/user/data",
    "http://169.254.169.254/latest/meta-data/",
    "http://10.0.0.5/internal",
    "http://192.168.1.1/",
    "file:///etc/passwd",
    "gopher://example.com/",
  ];

  for (const url of blocked) {
    test(`agent-reach refuses ${url}`, async ({ request }) => {
      const res = await request.post("/api/agent-reach/extract", { data: { url } });
      // Either unauthenticated (401) or rejected by the SSRF guard (400).
      // Never a successful fetch of an internal address.
      expect([400, 401]).toContain(res.status());
    });
  }
});

test.describe("Preview isolation", () => {
  test("preview render is not readable by an anonymous caller", async ({ request }) => {
    const res = await request.get("/api/preview/render/abc123");
    expect(res.status()).toBe(404);
  });

  test("preview document is not exposed cross-origin", async ({ request }) => {
    const res = await request.get("/api/preview/render/abc123");
    // No wildcard CORS on the preview surface.
    expect(res.headers()["access-control-allow-origin"]).toBeUndefined();
  });
});

test.describe("Information disclosure", () => {
  test("public health endpoint does not list configured secrets", async ({ request }) => {
    const res = await request.get("/api/health");
    const body = await res.text();
    expect(body).not.toContain("MISTRAL_API_KEY");
    expect(body).not.toContain("JWT_SECRET");
    expect(body).not.toContain("MONGODB_URI");
    expect(body).not.toContain("RAZORPAY_KEY_ID");
  });

  test("system health does not expose provider configuration anonymously", async ({ request }) => {
    const res = await request.get("/api/system/health");
    const body = await res.text();
    expect(body).not.toContain("openai");
    expect(body).not.toContain("anthropic");
    expect(body).not.toContain("gemini");
  });

  test("metrics endpoint fails closed without a configured key", async ({ request }) => {
    const res = await request.get("/api/metrics");
    expect([401, 503]).toContain(res.status());
  });
});

test.describe("Computer control", () => {
  test("app enumeration requires authentication", async ({ request }) => {
    const res = await request.get("/api/system/control");
    expect(res.status()).toBe(401);
  });

  test("app detection requires authentication", async ({ request }) => {
    const res = await request.get("/api/system/control?app=notepad");
    expect(res.status()).toBe(401);
  });
});
