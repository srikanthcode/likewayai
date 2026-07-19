import { NextRequest, NextResponse } from "next/server";
import { fetchAI } from "@/lib/api-manager";
import { getProviderForModel } from "@/lib/models";

export const maxDuration = 60;

interface SupportRequest {
  subject: string;
  message: string;
  category: string;
  userId?: string;
  userEmail?: string;
}

// ── AI Auto-Response Generator ──────────────────────────────────────
async function generateAIResponse(request: SupportRequest): Promise<string> {
  const systemPrompt = `You are LikeWay Support — a professional, friendly AI support agent for LikeWay AI platform.

Your job:
1. Acknowledge the user's issue warmly
2. Provide a helpful initial response
3. Set expectations for resolution
4. Keep responses concise and professional

TONE:
- Friendly but professional
- Empathetic to user frustration
- Action-oriented
- Clear next steps

FORMAT:
- Greeting
- Issue acknowledgment
- Initial diagnosis or troubleshooting steps
- Expected resolution time
- Contact info for escalation

RULES:
- Never say "I am an AI" — you are LikeWay Support
- Always provide actionable steps
- If you can solve it immediately, do so
- If not, set clear expectations
- Always end with "We're here to help!"

The company email is aixphonic.help@gmail.com`;

  const userMessage = `User Issue:
Subject: ${request.subject}
Category: ${request.category}
Message: ${request.message}
${request.userEmail ? `User Email: ${request.userEmail}` : ""}
${request.userId ? `User ID: ${request.userId}` : ""}

Generate a professional support response.`;

  try {
    const provider = "groq";
    const url = "https://api.groq.com/openai/v1/chat/completions";

    const response = await fetchAI(provider, url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || getDefaultResponse(request);
  } catch {
    return getDefaultResponse(request);
  }
}

function getDefaultResponse(request: SupportRequest): string {
  return `Hello! 👋

Thank you for contacting LikeWay Support.

**Your Issue:**
${request.subject}

**What happens next:**
1. Our team has received your report
2. We'll review it within 24 hours
3. You'll receive a detailed response at your email

**Your Reference:**
- Category: ${request.category}
- Submitted: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}

**Need immediate help?**
Email us directly at: aixphonic.help@gmail.com

We're here to help! 🚀`;
}

// ── Send Email Notification ─────────────────────────────────────────
async function sendSupportEmail(request: SupportRequest, ticketId: string): Promise<boolean> {
  // In production, integrate with SendGrid, Resend, or Nodemailer
  // For now, log the email that would be sent
  const emailData = {
    to: "aixphonic.help@gmail.com",
    subject: `[Support #${ticketId}] ${request.subject}`,
    body: `
      New Support Request
      
      Ticket ID: ${ticketId}
      Category: ${request.category}
      User ID: ${request.userId || "Anonymous"}
      User Email: ${request.userEmail || "Not provided"}
      
      Subject: ${request.subject}
      
      Message:
      ${request.message}
      
      ---
      Submitted at: ${new Date().toISOString()}
    `,
  };

  console.log("[Support] Email would be sent:", JSON.stringify(emailData, null, 2));

  // TODO: Integrate with email service
  // await resend.emails.send({ from: 'support@likeway.in', to: emailData.to, subject: emailData.subject, text: emailData.body });

  return true;
}

// ── POST: Submit Support Request ────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subject, message, category, userId, userEmail } = body as SupportRequest;

    // Validate
    if (!subject || !message) {
      return NextResponse.json(
        { error: "Subject and message are required" },
        { status: 400 }
      );
    }

    // Generate ticket ID
    const ticketId = `LW-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    console.log(`[Support] New ticket: ${ticketId}`);
    console.log(`[Support] Subject: ${subject}`);
    console.log(`[Support] Category: ${category}`);
    console.log(`[Support] User: ${userId || "Anonymous"}`);

    // Generate AI response
    const aiResponse = await generateAIResponse({ subject, message, category, userId, userEmail });

    // Send email notification (async, don't block response)
    sendSupportEmail({ subject, message, category, userId, userEmail }, ticketId).catch((err) => {
      console.error("[Support] Email send failed:", err);
    });

    // Store ticket (in production, save to database)
    const ticket = {
      id: ticketId,
      subject,
      message,
      category,
      userId: userId || null,
      userEmail: userEmail || null,
      status: "open",
      aiResponse,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // TODO: Save to database
    // await db.supportTickets.create({ data: ticket });

    console.log(`[Support] Ticket created: ${ticketId}`);

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticketId,
        subject,
        category,
        status: "open",
        aiResponse,
        createdAt: ticket.createdAt,
      },
      message: "Support request submitted successfully",
    });
  } catch (error: any) {
    console.error("[Support] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit support request" },
      { status: 500 }
    );
  }
}

// ── GET: Check ticket status ────────────────────────────────────────
export async function GET(req: NextRequest) {
  const ticketId = req.nextUrl.searchParams.get("ticketId");

  if (!ticketId) {
    return NextResponse.json({ error: "Ticket ID required" }, { status: 400 });
  }

  // TODO: Fetch from database
  // const ticket = await db.supportTickets.findUnique({ where: { id: ticketId } });

  return NextResponse.json({
    ticket: {
      id: ticketId,
      status: "open",
      message: "Ticket received. Our team will respond within 24 hours.",
    },
  });
}
